'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');

const config = require('../config');
const { adminCsrf, verifyCsrf, safeEqual } = require('../middleware/csrf');
const { requireAuth } = require('../middleware/auth');
const { validateAnnouncement, parseId } = require('../utils/validation');
const { handleImageUpload, removeUploadedFile } = require('../utils/upload');

function emptyValues() {
  return {
    title: '',
    summary: '',
    body: '',
    category: 'Announcement',
    imageUrl: '',
    isPublished: true,
  };
}

function rowToValues(row) {
  return {
    title: row.title,
    summary: row.summary,
    body: row.body,
    category: row.category,
    imageUrl: row.image_url || '',
    isPublished: row.is_published,
  };
}

module.exports = function adminRoutes(database) {
  const router = express.Router();

  router.use(adminCsrf);

  router.get('/login', (req, res) => {
    if (req.session.user) return res.redirect('/admin');
    return res.render('admin/login', {
      pageTitle: 'Administrator sign in',
      error: null,
      username: '',
    });
  });

  router.post('/login', async (req, res, next) => {
    try {
      const username =
        typeof req.body.username === 'string' ? req.body.username.trim() : '';
      const password =
        typeof req.body.password === 'string' ? req.body.password : '';

      if (!config.adminPasswordHash) {
        return res.status(503).render('admin/login', {
          pageTitle: 'Administrator sign in',
          error: 'Administrator access is not configured on this server.',
          username,
        });
      }

      const usernameOk = safeEqual(username, config.adminUsername);
      const passwordOk =
        usernameOk &&
        (await bcrypt.compare(password, config.adminPasswordHash));

      if (!usernameOk || !passwordOk) {
        return res.status(401).render('admin/login', {
          pageTitle: 'Administrator sign in',
          error: 'Invalid username or password.',
          username,
        });
      }

      const returnTo =
        req.session.returnTo && req.session.returnTo.startsWith('/admin')
          ? req.session.returnTo
          : '/admin';

      return req.session.regenerate((error) => {
        if (error) return next(error);
        req.session.user = { username: config.adminUsername };
        req.session.flash = {
          type: 'success',
          message: 'Signed in successfully.',
        };
        return req.session.save((saveError) => {
          if (saveError) return next(saveError);
          return res.redirect(returnTo);
        });
      });
    } catch (error) {
      return next(error);
    }
  });

  router.post('/logout', verifyCsrf, (req, res, next) => {
    req.session.destroy((error) => {
      if (error) return next(error);
      res.clearCookie('umbb.sid');
      return res.redirect('/');
    });
  });

  router.use(requireAuth);

  router.get('/', async (req, res, next) => {
    try {
      const [stats, announcements] = await Promise.all([
        database.query(
          `SELECT COUNT(*)::int AS total,
                  COUNT(*) FILTER (WHERE is_published)::int AS published,
                  COUNT(*) FILTER (WHERE NOT is_published)::int AS drafts
             FROM announcements`
        ),
        database.query(
          `SELECT id, title, summary, category, image_url, is_published, published_at, updated_at
             FROM announcements
            ORDER BY updated_at DESC, id DESC`
        ),
      ]);

      return res.render('admin/dashboard', {
        pageTitle: 'Administration',
        stats: stats.rows[0],
        announcements: announcements.rows,
      });
    } catch (error) {
      return next(error);
    }
  });

  router.get('/announcements/new', (req, res) => {
    res.render('admin/form', {
      pageTitle: 'New announcement',
      mode: 'create',
      action: '/admin/announcements',
      values: emptyValues(),
      errors: [],
      announcementId: null,
    });
  });

  router.post('/announcements', handleImageUpload, verifyCsrf, async (req, res, next) => {
    try {
      const validation = validateAnnouncement(req.body);
      if (req.uploadError) {
        validation.errors.push(req.uploadError);
        validation.valid = false;
      }

      let imageUrl = null;
      if (req.file) {
        imageUrl = `/uploads/${req.file.filename}`;
      } else if (validation.values.imageUrl) {
        imageUrl = validation.values.imageUrl;
      }

      if (!validation.valid) {
        if (req.file) {
          removeUploadedFile(`/uploads/${req.file.filename}`);
        }
        return res.status(422).render('admin/form', {
          pageTitle: 'New announcement',
          mode: 'create',
          action: '/admin/announcements',
          values: { ...validation.values, imageUrl },
          errors: validation.errors,
          announcementId: null,
        });
      }

      const values = validation.values;
      const result = await database.query(
        `INSERT INTO announcements (title, summary, body, category, image_url, is_published, published_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         RETURNING id`,
        [
          values.title,
          values.summary,
          values.body,
          values.category,
          imageUrl,
          values.isPublished,
        ]
      );

      req.session.flash = {
        type: 'success',
        message: `Announcement #${result.rows[0].id} created.`,
      };
      return res.redirect('/admin');
    } catch (error) {
      if (req.file) {
        removeUploadedFile(`/uploads/${req.file.filename}`);
      }
      return next(error);
    }
  });

  router.get('/announcements/:id/edit', async (req, res, next) => {
    try {
      const id = parseId(req.params.id);
      if (!id) return next();

      const result = await database.query(
        `SELECT id, title, summary, body, category, image_url, is_published
           FROM announcements
          WHERE id = $1`,
        [id]
      );

      if (result.rows.length === 0) return next();

      return res.render('admin/form', {
        pageTitle: 'Edit announcement',
        mode: 'edit',
        action: `/admin/announcements/${id}`,
        values: rowToValues(result.rows[0]),
        errors: [],
        announcementId: id,
      });
    } catch (error) {
      return next(error);
    }
  });

  router.post('/announcements/:id', handleImageUpload, verifyCsrf, async (req, res, next) => {
    try {
      const id = parseId(req.params.id);
      if (!id) return next();

      const existingResult = await database.query(
        'SELECT id, image_url FROM announcements WHERE id = $1',
        [id]
      );
      if (existingResult.rows.length === 0) return next();
      const existing = existingResult.rows[0];

      const validation = validateAnnouncement(req.body);
      if (req.uploadError) {
        validation.errors.push(req.uploadError);
        validation.valid = false;
      }

      let imageUrl = existing.image_url;
      if (req.file) {
        imageUrl = `/uploads/${req.file.filename}`;
      } else if (req.body.remove_image === '1' || req.body.remove_image === 'true') {
        imageUrl = null;
      } else if (validation.values.imageUrl !== undefined && validation.values.imageUrl !== '') {
        imageUrl = validation.values.imageUrl;
      }

      if (!validation.valid) {
        if (req.file) {
          removeUploadedFile(`/uploads/${req.file.filename}`);
        }
        return res.status(422).render('admin/form', {
          pageTitle: 'Edit announcement',
          mode: 'edit',
          action: `/admin/announcements/${id}`,
          values: { ...validation.values, imageUrl },
          errors: validation.errors,
          announcementId: id,
        });
      }

      const values = validation.values;
      const result = await database.query(
        `UPDATE announcements
            SET title = $1,
                summary = $2,
                body = $3,
                category = $4,
                image_url = $5,
                is_published = $6,
                updated_at = NOW()
          WHERE id = $7
          RETURNING id`,
        [
          values.title,
          values.summary,
          values.body,
          values.category,
          imageUrl,
          values.isPublished,
          id,
        ]
      );

      if (result.rows.length === 0) return next();

      if (existing.image_url && existing.image_url !== imageUrl) {
        removeUploadedFile(existing.image_url);
      }

      req.session.flash = {
        type: 'success',
        message: `Announcement #${id} updated.`,
      };
      return res.redirect('/admin');
    } catch (error) {
      if (req.file) {
        removeUploadedFile(`/uploads/${req.file.filename}`);
      }
      return next(error);
    }
  });

  router.post(
    '/announcements/:id/delete',
    verifyCsrf,
    async (req, res, next) => {
      try {
        const id = parseId(req.params.id);
        if (!id) return next();

        const existingResult = await database.query(
          'SELECT id, image_url FROM announcements WHERE id = $1',
          [id]
        );
        const existing = existingResult.rows.length > 0 ? existingResult.rows[0] : null;

        const result = await database.query(
          'DELETE FROM announcements WHERE id = $1 RETURNING id',
          [id]
        );

        if (result.rows.length === 0) return next();

        if (existing && existing.image_url) {
          removeUploadedFile(existing.image_url);
        }

        req.session.flash = {
          type: 'warning',
          message: `Announcement #${id} deleted.`,
        };
        return res.redirect('/admin');
      } catch (error) {
        return next(error);
      }
    }
  );

  return router;
};

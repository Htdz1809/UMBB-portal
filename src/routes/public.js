'use strict';

const express = require('express');
const config = require('../config');
const { parseId } = require('../utils/validation');

module.exports = function publicRoutes(database) {
  const router = express.Router();

  router.get('/', async (req, res, next) => {
    try {
      const [announcements, departmentCount, announcementCount] =
        await Promise.all([
          database.query(
            `SELECT id, title, summary, category, image_url, published_at
               FROM announcements
              WHERE is_published = TRUE
              ORDER BY published_at DESC, id DESC
              LIMIT 3`
          ),
          database.query('SELECT COUNT(*)::int AS count FROM departments'),
          database.query(
            'SELECT COUNT(*)::int AS count FROM announcements WHERE is_published = TRUE'
          ),
        ]);

      res.render('home', {
        pageTitle: 'Home',
        recentAnnouncements: announcements.rows,
        stats: {
          departments: departmentCount.rows[0].count,
          announcements: announcementCount.rows[0].count,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/departments', async (req, res, next) => {
    try {
      const departments = await database.query(
        `SELECT id, name, description, head_of_department, contact_email
           FROM departments
          ORDER BY name ASC`
      );

      res.render('departments', {
        pageTitle: 'Departments',
        departments: departments.rows,
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/news', async (req, res, next) => {
    try {
      const category = typeof req.query.category === 'string' ? req.query.category : '';
      const search =
        typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';

      const conditions = ['is_published = TRUE'];
      const values = [];

      if (category && config.categories.includes(category)) {
        values.push(category);
        conditions.push(`category = $${values.length}`);
      }

      if (search) {
        values.push(`%${search}%`);
        conditions.push(
          `(title ILIKE $${values.length} OR summary ILIKE $${values.length} OR body ILIKE $${values.length})`
        );
      }

      const result = await database.query(
        `SELECT id, title, summary, category, image_url, published_at
           FROM announcements
          WHERE ${conditions.join(' AND ')}
          ORDER BY published_at DESC, id DESC`,
        values
      );

      res.render('news', {
        pageTitle: 'News and announcements',
        announcements: result.rows,
        selectedCategory: config.categories.includes(category) ? category : '',
        searchQuery: search,
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/news/:id', async (req, res, next) => {
    try {
      const id = parseId(req.params.id);
      if (!id) return next();

      const result = await database.query(
        `SELECT id, title, summary, body, category, image_url, published_at, updated_at
           FROM announcements
          WHERE id = $1 AND is_published = TRUE`,
        [id]
      );

      if (result.rows.length === 0) return next();

      return res.render('news-detail', {
        pageTitle: result.rows[0].title,
        announcement: result.rows[0],
      });
    } catch (error) {
      return next(error);
    }
  });

  return router;
};

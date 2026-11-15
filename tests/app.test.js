'use strict';

process.env.NODE_ENV = 'test';
process.env.ADMIN_USERNAME = 'admin';
process.env.ADMIN_PASSWORD = 'correct-horse-battery-staple';
process.env.SESSION_SECRET = 'test-session-secret-only';
process.env.COOKIE_SECURE = 'false';
process.env.TRUST_PROXY = '0';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const session = require('express-session');

const { createApp } = require('../src/app');

const publishedAt = new Date('2026-11-12T09:00:00Z');

const announcement = {
  id: 1,
  title: 'Autumn 2026 enrolment now open',
  summary: 'Applications for undergraduate and postgraduate programmes are open.',
  body: 'Full announcement body for testing.',
  category: 'Announcement',
  is_published: true,
  published_at: publishedAt,
  updated_at: publishedAt,
};

const department = {
  id: 1,
  name: 'Faculty of Sciences',
  description: 'Six departments covering mathematics, physics, chemistry, computer science and biology.',
  head_of_department: 'Abdelhakim DAOUI, Dean',
  contact_email: 'a.daoui@univ-boumerdes.dz',
};

function createFakeDb() {
  return {
    query: async (text, params = []) => {
      const sql = String(text).replace(/\s+/g, ' ').trim();

      if (sql === 'SELECT 1') return { rows: [{ ok: 1 }] };

      if (sql.startsWith('SELECT COUNT(*)::int AS count FROM departments')) {
        return { rows: [{ count: 8 }] };
      }

      if (
        sql.startsWith(
          'SELECT COUNT(*)::int AS count FROM announcements WHERE is_published = TRUE'
        )
      ) {
        return { rows: [{ count: 1 }] };
      }

      if (sql.includes('LIMIT 3') && sql.includes('FROM announcements')) {
        return { rows: [announcement] };
      }

      if (sql.includes('ORDER BY updated_at')) {
        return { rows: [announcement] };
      }

      if (sql.includes('COUNT(*) FILTER')) {
        return { rows: [{ total: 1, published: 1, drafts: 0 }] };
      }

      if (sql.includes('FROM departments ORDER BY name')) {
        return { rows: [department] };
      }

      if (sql.includes('WHERE id = $1 AND is_published = TRUE')) {
        return { rows: [announcement] };
      }

      if (sql.includes('FROM announcements WHERE id = $1')) {
        return { rows: [announcement] };
      }

      if (sql.includes('FROM announcements') && sql.includes('is_published = TRUE')) {
        return { rows: [announcement] };
      }

      if (sql.startsWith('INSERT INTO announcements')) {
        return { rows: [{ id: 42 }] };
      }

      if (sql.startsWith('UPDATE announcements')) {
        return { rows: [{ id: Number(params[5]) || 1 }] };
      }

      if (sql.startsWith('DELETE FROM announcements')) {
        return { rows: [{ id: Number(params[0]) || 1 }] };
      }

      throw new Error(`Unexpected fake database query: ${sql}`);
    },
  };
}

function buildApp() {
  return createApp({
    db: createFakeDb(),
    sessionStore: new session.MemoryStore(),
  });
}

function extractCsrf(html) {
  const match = html.match(/name="_csrf" value="([^"]+)"/);
  assert.ok(match, 'Expected a CSRF token in the rendered form');
  return match[1];
}

async function signIn(app) {
  const agent = request.agent(app);
  const loginPage = await agent.get('/admin/login').expect(200);
  const token = extractCsrf(loginPage.text);

  await agent
    .post('/admin/login')
    .type('form')
    .send({
      _csrf: token,
      username: 'admin',
      password: 'correct-horse-battery-staple',
    })
    .expect(302)
    .expect('Location', '/admin');

  const dashboard = await agent.get('/admin').expect(200);
  return { agent, csrfToken: extractCsrf(dashboard.text) };
}

test('health check reports database availability', async () => {
  const response = await request(buildApp()).get('/healthz').expect(200);
  assert.equal(response.body.status, 'ok');
  assert.equal(response.body.database, 'up');
});

test('home page renders university presentation and recent announcements', async () => {
  const response = await request(buildApp()).get('/').expect(200);
  assert.match(response.text, /M(?:'|&#39;)Hamed Bougara University of Boumerd[eè]s/);
  assert.match(response.text, /UMBB/);
  assert.match(response.text, /Recent announcements/);
  assert.match(response.text, /Autumn 2026 enrolment now open/);
});

test('faculties and institutes page renders database content', async () => {
  const response = await request(buildApp()).get('/departments').expect(200);
  assert.match(response.text, /Faculty of Sciences/);
  assert.match(response.text, /Abdelhakim DAOUI/);
});

test('news page lists announcements and supports filters', async () => {
  const response = await request(buildApp())
    .get('/news?category=Announcement&q=enrolment')
    .expect(200);
  assert.match(response.text, /Autumn 2026 enrolment now open/);
  assert.match(response.text, /value="enrolment"/);
});

test('announcement detail page renders full body', async () => {
  const response = await request(buildApp()).get('/news/1').expect(200);
  assert.match(response.text, /Full announcement body for testing/);
});

test('unknown route returns the styled 404 page', async () => {
  const response = await request(buildApp()).get('/does-not-exist').expect(404);
  assert.match(response.text, /Page not found/);
});

test('admin area redirects anonymous visitors to the login page', async () => {
  await request(buildApp())
    .get('/admin')
    .expect(302)
    .expect('Location', '/admin/login');
});

test('login page exposes a CSRF token', async () => {
  const response = await request(buildApp()).get('/admin/login').expect(200);
  assert.match(response.text, /Administrator sign in/);
  extractCsrf(response.text);
});

test('invalid credentials are rejected', async () => {
  const app = buildApp();
  const agent = request.agent(app);
  const page = await agent.get('/admin/login').expect(200);
  const token = extractCsrf(page.text);

  await agent
    .post('/admin/login')
    .type('form')
    .send({ _csrf: token, username: 'admin', password: 'wrong-password' })
    .expect(401);
});

test('administrator can sign in and open the dashboard', async () => {
  const { agent } = await signIn(buildApp());
  const response = await agent.get('/admin').expect(200);
  assert.match(response.text, /Announcement administration/);
});

test('create request without a CSRF token is rejected', async () => {
  const { agent } = await signIn(buildApp());
  await agent
    .post('/admin/announcements')
    .type('form')
    .send({
      title: 'A valid title',
      summary: 'A valid summary for the announcement.',
      body: 'A valid body for the announcement.',
      category: 'News',
    })
    .expect(403);
});

test('administrator can create an announcement', async () => {
  const { agent, csrfToken } = await signIn(buildApp());
  await agent
    .post('/admin/announcements')
    .type('form')
    .send({
      _csrf: csrfToken,
      title: 'New library opening hours',
      summary: 'The library will open later during the examination period.',
      body: 'Full details about the temporary library opening hours.',
      category: 'Announcement',
      is_published: 'on',
    })
    .expect(302)
    .expect('Location', '/admin');
});

test('administrator can create an announcement with an image upload', async () => {
  const { agent, csrfToken } = await signIn(buildApp());
  await agent
    .post('/admin/announcements')
    .field('_csrf', csrfToken)
    .field('title', 'Campus green initiative launched')
    .field('summary', 'University launches solar canopy and recycling program.')
    .field('body', 'Detailed report on green sustainability efforts across campus.')
    .field('category', 'News')
    .field('is_published', 'on')
    .attach('image', Buffer.from('fake-image-bytes'), 'test-image.png')
    .expect(302)
    .expect('Location', '/admin');
});

test('administrator can open the edit form', async () => {
  const { agent } = await signIn(buildApp());
  const response = await agent.get('/admin/announcements/1/edit').expect(200);
  assert.match(response.text, /Edit announcement/);
  assert.match(response.text, /Autumn 2026 enrolment now open/);
});

test('administrator can update an announcement', async () => {
  const { agent, csrfToken } = await signIn(buildApp());
  await agent
    .post('/admin/announcements/1')
    .type('form')
    .send({
      _csrf: csrfToken,
      title: 'Updated enrolment announcement',
      summary: 'Applications remain open until the middle of December.',
      body: 'Updated full details about the autumn 2026 enrolment period.',
      category: 'Announcement',
      is_published: 'on',
    })
    .expect(302)
    .expect('Location', '/admin');
});

test('administrator can sign out', async () => {
  const { agent, csrfToken } = await signIn(buildApp());
  await agent
    .post('/admin/logout')
    .type('form')
    .send({ _csrf: csrfToken })
    .expect(302)
    .expect('Location', '/');

  await agent.get('/admin').expect(302).expect('Location', '/admin/login');
});

test('administrator can delete an announcement', async () => {
  const { agent, csrfToken } = await signIn(buildApp());
  await agent
    .post('/admin/announcements/1/delete')
    .type('form')
    .send({ _csrf: csrfToken })
    .expect(302)
    .expect('Location', '/admin');
});

test('invalid announcement input is rejected with 422', async () => {
  const { agent, csrfToken } = await signIn(buildApp());
  const response = await agent
    .post('/admin/announcements')
    .type('form')
    .send({
      _csrf: csrfToken,
      title: 'x',
      summary: 'short',
      body: 'short',
      category: 'Unknown',
    })
    .expect(422);

  assert.match(response.text, /Please correct the following/);
  assert.match(response.text, /Title must be between 3 and 160 characters/);
});

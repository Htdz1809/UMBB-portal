'use strict';

require('dotenv').config({ quiet: true });

const config = require('./src/config');
const db = require('./src/db');
const { createApp } = require('./src/app');

async function main() {
  await db.waitForDatabase();
  await db.ensureSchema();
  await db.seed();

  const app = createApp();
  const server = app.listen(config.port, '0.0.0.0', () => {
    console.log(
      `[server] ${config.university.name} portal listening on port ${config.port} (${config.nodeEnv})`
    );
    console.log('[server] Public site: /  |  Administration: /admin/login');
  });

  let shuttingDown = false;
  const shutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[server] ${signal} received, shutting down gracefully...`);
    server.close(async () => {
      try {
        await db.close();
        console.log('[server] HTTP server and database pool closed.');
        process.exit(0);
      } catch (error) {
        console.error('[server] Error during shutdown:', error.message);
        process.exit(1);
      }
    });
    setTimeout(() => {
      console.error('[server] Forced shutdown after timeout.');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((error) => {
  console.error('[server] Fatal startup error:', error.message);
  console.error(error.stack);
  process.exit(1);
});

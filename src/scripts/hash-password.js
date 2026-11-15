'use strict';

const bcrypt = require('bcryptjs');

const password = process.argv[2] || process.env.ADMIN_PASSWORD;

if (!password) {
  console.error('Usage: npm run hash-password -- "your-password"');
  process.exit(1);
}

if (password.length < 12) {
  console.warn(
    'Warning: administrator passwords should be at least 12 characters long.'
  );
}

console.log(bcrypt.hashSync(password, 12));

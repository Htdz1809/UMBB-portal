'use strict';

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const config = require('../config');

const uploadsDir = path.join(config.rootDir, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'];
    const safeExt = allowedExts.includes(ext) ? ext : '.jpg';
    const unique = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    cb(null, `announcement-${unique}${safeExt}`);
  },
});

function fileFilter(req, file, cb) {
  const allowedMimes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
  ];
  if (allowedMimes.includes(file.mimetype) || file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (PNG, JPG, WebP, GIF, SVG) are allowed.'));
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 8 * 1024 * 1024, // 8MB limit
  },
});

function handleImageUpload(req, res, next) {
  upload.single('image')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          req.uploadError = 'Image must be smaller than 8MB.';
        } else {
          req.uploadError = err.message;
        }
      } else {
        req.uploadError = err.message || 'Error processing uploaded image.';
      }
    }
    next();
  });
}

function removeUploadedFile(imageUrl) {
  if (!imageUrl || typeof imageUrl !== 'string') return;
  if (!imageUrl.startsWith('/uploads/')) return;
  const filename = path.basename(imageUrl);
  const filePath = path.join(uploadsDir, filename);
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.warn(`[upload] Could not delete file ${filePath}:`, err.message);
  }
}

module.exports = {
  upload,
  uploadsDir,
  handleImageUpload,
  removeUploadedFile,
};

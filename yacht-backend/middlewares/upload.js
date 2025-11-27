// src/middlewares/upload.js
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, path.join(__dirname, '../../uploads')),
    filename: (_req, file, cb) => {
        const ext = (path.extname(file.originalname) || '').toLowerCase();
        cb(null, crypto.randomBytes(16).toString('hex') + ext);
    }
});

function fileFilter(_req, file, cb) {
    const ok = /image\/(png|jpe?g|webp|gif|svg\+xml)/i.test(file.mimetype);
    cb(ok ? null : new Error('TYPE_NOT_ALLOWED'), ok);
}

exports.uploadImages = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

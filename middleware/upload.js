/**
 * Upload Middleware
 * - STORAGE_MODE=local  → saves to backend/public/uploads/ (default, Hostinger)
 * - STORAGE_MODE=cloudinary → uploads to Cloudinary cloud
 * All config from .env — no hardcoded values
 */
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

const STORAGE_MODE    = (process.env.STORAGE_MODE || 'local').toLowerCase();
const MAX_PDF_MB      = parseInt(process.env.MAX_PDF_SIZE_MB   || '50',  10);
const MAX_IMAGE_MB    = parseInt(process.env.MAX_IMAGE_SIZE_MB || '10',  10);
const UPLOAD_BASE     = path.join(__dirname, '../public/uploads');

// ── Ensure base upload directories exist
['documents', 'images'].forEach(d => fs.mkdirSync(path.join(UPLOAD_BASE, d), { recursive: true }));

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LOCAL STORAGE (Hostinger / VPS)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const localPdfStorage = multer.diskStorage({
  destination(req, _file, cb) {
    const category = req.body.category || 'others';
    const dir = path.join(UPLOAD_BASE, 'documents', category);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(_req, file, cb) {
    // Sanitize filename — keep original name for recognisability
    const sanitized = file.originalname
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9._()[\]-]/g, '_');
    // Prefix timestamp only if file already exists
    const dir = path.join(UPLOAD_BASE, 'documents', _req.body.category || 'others');
    if (fs.existsSync(path.join(dir, sanitized))) {
      const ext  = path.extname(sanitized);
      const base = path.basename(sanitized, ext);
      cb(null, `${base}_${Date.now()}${ext}`);
    } else {
      cb(null, sanitized);
    }
  },
});

const localImageStorage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, path.join(UPLOAD_BASE, 'images'));
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLOUDINARY STORAGE (optional)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
let cloudinaryImageStorage = null;

if (STORAGE_MODE === 'cloudinary') {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.warn('⚠️  STORAGE_MODE=cloudinary but Cloudinary env vars are missing. Falling back to local storage.');
  } else {
    try {
      const cloudinary = require('cloudinary').v2;
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key:    process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });
      const { CloudinaryStorage } = require('multer-storage-cloudinary');
      cloudinaryImageStorage = new CloudinaryStorage({
        cloudinary,
        params: async (_req, file) => ({
          folder:           'vaswani-industries',
          allowed_formats:  ['jpg', 'jpeg', 'png', 'webp'],
          transformation:   [{ width: 1200, quality: 'auto', fetch_format: 'auto' }],
          public_id:        `${Date.now()}-${path.basename(file.originalname, path.extname(file.originalname))}`,
        }),
      });
      console.log('☁️  Cloudinary image storage active');
    } catch (e) {
      console.warn('⚠️  Cloudinary packages not installed. Run: npm install cloudinary multer-storage-cloudinary');
      console.warn('⚠️  Falling back to local image storage.');
    }
  }
}

// ── Decide which image storage to use
const activeImageStorage = cloudinaryImageStorage || localImageStorage;
const usingCloudinary    = !!cloudinaryImageStorage;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MULTER INSTANCES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const uploadPDF = multer({
  storage:    localPdfStorage,       // PDFs always local (Cloudinary free tier doesn't serve PDFs well)
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') return cb(null, true);
    cb(Object.assign(new Error('Only PDF files are allowed (.pdf)'), { code: 'INVALID_FILE_TYPE' }), false);
  },
  limits: { fileSize: MAX_PDF_MB * 1024 * 1024 },
});

const uploadImage = multer({
  storage:    activeImageStorage,
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) return cb(null, true);
    cb(Object.assign(new Error('Only image files allowed (jpg/png/webp)'), { code: 'INVALID_FILE_TYPE' }), false);
  },
  limits: { fileSize: MAX_IMAGE_MB * 1024 * 1024 },
});

/**
 * Build the public URL for a locally stored file.
 * @param {string} category - document category slug
 * @param {string} filename  - sanitized filename
 * @param {'documents'|'images'} type
 */
function buildLocalUrl(category, filename, type = 'documents') {
  const base = process.env.BACKEND_URL || 'http://localhost:5000';
  if (type === 'images') return `${base}/uploads/images/${filename}`;
  return `${base}/uploads/documents/${category}/${filename}`;
}

module.exports = { uploadPDF, uploadImage, usingCloudinary, buildLocalUrl, UPLOAD_BASE };

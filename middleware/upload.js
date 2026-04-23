 
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const mongoose = require('mongoose');

const MAX_PDF_MB   = parseInt(process.env.MAX_PDF_SIZE_MB   || '50',  10);
const MAX_IMAGE_MB = parseInt(process.env.MAX_IMAGE_SIZE_MB || '10',  10);
const UPLOAD_BASE  = path.join(__dirname, '../public/uploads');

// Folders setup logic
const ensureExists = (dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

// Base folders create karein
['documents', 'images'].forEach(d => ensureExists(path.join(UPLOAD_BASE, d)));

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STORAGE CONFIG (HOSTINGER READY)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const storageConfig = multer.diskStorage({
    destination(req, file, cb) {
        let subFolder = 'documents';
        if (file.mimetype.startsWith('image/')) {
            subFolder = 'images';
        } else {
            // PDF ko category ke folder mein daalne ke liye
            const category = req.body.category || 'others';
            subFolder = path.join('documents', category);
        }
        
        const finalDir = path.join(UPLOAD_BASE, subFolder);
        ensureExists(finalDir);
        cb(null, finalDir);
    },
    filename(req, file, cb) {
        // Unique ID generate kar rahe hain (MongoDB Style)
        const uniqueId = new mongoose.Types.ObjectId();
        const ext = path.extname(file.originalname).toLowerCase();
        // Format: ID-OriginalName.pdf (Space ko underscore se replace kiya)
        const sanitizedName = file.originalname.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
        cb(null, `${uniqueId}-${sanitizedName}`);
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MULTER INSTANCES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const uploadPDF = multer({
    storage: storageConfig,
    fileFilter: (_req, file, cb) => {
        if (file.mimetype === 'application/pdf') return cb(null, true);
        cb(new Error('Only PDF files are allowed'), false);
    },
    limits: { fileSize: MAX_PDF_MB * 1024 * 1024 },
});

const uploadImage = multer({
    storage: storageConfig,
    fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('image/')) return cb(null, true);
        cb(new Error('Only images allowed'), false);
    },
    limits: { fileSize: MAX_IMAGE_MB * 1024 * 1024 },
});

// Helper to build URL for Frontend/Admin
function buildFileUrl(filePath) {
    const base = process.env.BACKEND_URL || 'https://vil-server-latest.onrender.com';
    // filePath usually looks like: /uploads/documents/category/file.pdf
    return `${base}${filePath}`;
}

module.exports = { uploadPDF, uploadImage, buildFileUrl, UPLOAD_BASE };
// /**
//  * Upload Middleware
//  * - STORAGE_MODE=local  → saves to backend/public/uploads/
//  * - STORAGE_MODE=cloudinary → uploads to Cloudinary cloud
//  */
// const multer = require('multer');
// const path   = require('path');
// const fs     = require('fs');

// const STORAGE_MODE    = (process.env.STORAGE_MODE || 'local').toLowerCase();
// const MAX_PDF_MB      = parseInt(process.env.MAX_PDF_SIZE_MB   || '50',  10);
// const MAX_IMAGE_MB    = parseInt(process.env.MAX_IMAGE_SIZE_MB || '10',  10);
// const UPLOAD_BASE     = path.join(__dirname, '../public/uploads');

// // Ensure base upload directories exist
// ['documents', 'images'].forEach(d => {
//     const dir = path.join(UPLOAD_BASE, d);
//     if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
// });

// // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// // 1. CLOUDINARY STORAGE CONFIG
// // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// let cloudinaryImageStorage = null;
// let cloudinaryPdfStorage = null;

// if (STORAGE_MODE === 'cloudinary') {
//     if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
//         const cloudinary = require('cloudinary').v2;
//         const { CloudinaryStorage } = require('multer-storage-cloudinary');

//         cloudinary.config({
//             cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//             api_key:    process.env.CLOUDINARY_API_KEY,
//             api_secret: process.env.CLOUDINARY_API_SECRET,
//         });

//         // Image Storage
//         cloudinaryImageStorage = new CloudinaryStorage({
//             cloudinary,
//             params: async (req, file) => ({
//                 folder: 'vaswani-industries/images',
//                 allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
//                 public_id: `${Date.now()}-${file.originalname.split('.')[0]}`,
//             }),
//         });

//         // PDF Storage (CRITICAL FIX)
//         cloudinaryPdfStorage = new CloudinaryStorage({
//             cloudinary,
//             params: async (req, file) => ({
//                 folder: 'vaswani-industries/documents',
//                 resource_type: 'raw', // Required for PDFs
//                 format: 'pdf',
//                 public_id: `${Date.now()}-${file.originalname.split('.')[0]}`,
//             }),
//         });
//         console.log('☁️  Cloudinary Storage initialized for Images & PDFs');
//     }
// }

// // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// // 2. LOCAL STORAGE (Fallback)
// // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// const localPdfStorage = multer.diskStorage({
//     destination(req, file, cb) {
//         const category = req.body.category || 'others';
//         const dir = path.join(UPLOAD_BASE, 'documents', category);
//         if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
//         cb(null, dir);
//     },
//     filename(req, file, cb) {
//         const sanitized = file.originalname.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
//         cb(null, `${Date.now()}-${sanitized}`);
//     },
// });

// const localImageStorage = multer.diskStorage({
//     destination(_req, _file, cb) {
//         cb(null, path.join(UPLOAD_BASE, 'images'));
//     },
//     filename(_req, file, cb) {
//         cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`);
//     },
// });

// // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// // 3. MULTER INSTANCES
// // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// const uploadPDF = multer({
//     storage: cloudinaryPdfStorage || localPdfStorage, // PDF ab cloud par ja sakta hai!
//     fileFilter: (_req, file, cb) => {
//         if (file.mimetype === 'application/pdf') return cb(null, true);
//         cb(new Error('Only PDF files are allowed'), false);
//     },
//     limits: { fileSize: MAX_PDF_MB * 1024 * 1024 },
// });

// const uploadImage = multer({
//     storage: cloudinaryImageStorage || localImageStorage,
//     limits: { fileSize: MAX_IMAGE_MB * 1024 * 1024 },
// });

// function buildLocalUrl(category, filename, type = 'documents') {
//     const base = process.env.BACKEND_URL || 'http://localhost:5000';
//     if (type === 'images') return `${base}/uploads/images/${filename}`;
//     return `${base}/uploads/documents/${category}/${filename}`;
// }

// module.exports = { uploadPDF, uploadImage, buildLocalUrl, UPLOAD_BASE };

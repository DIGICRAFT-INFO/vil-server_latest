const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

const MAX_PDF_MB = parseInt(process.env.MAX_PDF_SIZE_MB || '50', 10);
const MAX_IMAGE_MB = parseInt(process.env.MAX_IMAGE_SIZE_MB || '10', 10);
const UPLOAD_BASE = path.join(__dirname, '../public/uploads');

// Ensure folders exist
const ensureExists = (dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

['documents', 'images'].forEach(d => ensureExists(path.join(UPLOAD_BASE, d)));

const storageConfig = multer.diskStorage({
    destination(req, file, cb) {
        let subFolder = 'documents';
        if (file.mimetype.startsWith('image/')) {
            subFolder = 'images';
        } else {
            const category = req.body.category || 'others';
            subFolder = path.join('documents', category);
        }
        const finalDir = path.join(UPLOAD_BASE, subFolder);
        ensureExists(finalDir);
        cb(null, finalDir);
    },
    filename(req, file, cb) {
        const uniqueId = new mongoose.Types.ObjectId();
        const sanitizedName = file.originalname.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
        cb(null, `${uniqueId}-${sanitizedName}`);
    }
});

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

// Fix: Function ka naam buildLocalUrl kar diya hai routes se match karne ke liye
function buildLocalUrl(req, filename, type = 'images') {
    const base = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
    return `${base}/uploads/${type}/${filename}`;
}

const usingCloudinary = !!process.env.CLOUDINARY_CLOUD_NAME;

module.exports = { uploadPDF, uploadImage, buildLocalUrl, UPLOAD_BASE, usingCloudinary };

// const multer = require('multer');
// const path   = require('path');
// const fs     = require('fs');
// const mongoose = require('mongoose');

// const MAX_PDF_MB   = parseInt(process.env.MAX_PDF_SIZE_MB   || '50',  10);
// const MAX_IMAGE_MB = parseInt(process.env.MAX_IMAGE_SIZE_MB || '10',  10);
// const UPLOAD_BASE  = path.join(__dirname, '../public/uploads');

// // Ensure folders exist
// const ensureExists = (dir) => {
//     if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
// };

// ['documents', 'images'].forEach(d => ensureExists(path.join(UPLOAD_BASE, d)));

// const storageConfig = multer.diskStorage({
//     destination(req, file, cb) {
//         let subFolder = 'documents';
//         if (file.mimetype.startsWith('image/')) {
//             subFolder = 'images';
//         } else {
//             const category = req.body.category || 'others';
//             subFolder = path.join('documents', category);
//         }
//         const finalDir = path.join(UPLOAD_BASE, subFolder);
//         ensureExists(finalDir);
//         cb(null, finalDir);
//     },
//     filename(req, file, cb) {
//         // Unique ID for each file to prevent overwriting
//         const uniqueId = new mongoose.Types.ObjectId();
//         const sanitizedName = file.originalname.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
//         cb(null, `${uniqueId}-${sanitizedName}`);
//     }
// });

// const uploadPDF = multer({
//     storage: storageConfig,
//     fileFilter: (_req, file, cb) => {
//         if (file.mimetype === 'application/pdf') return cb(null, true);
//         cb(new Error('Only PDF files are allowed'), false);
//     },
//     limits: { fileSize: MAX_PDF_MB * 1024 * 1024 },
// });

// const uploadImage = multer({
//     storage: storageConfig,
//     fileFilter: (_req, file, cb) => {
//         if (file.mimetype.startsWith('image/')) return cb(null, true);
//         cb(new Error('Only images allowed'), false);
//     },
//     limits: { fileSize: MAX_IMAGE_MB * 1024 * 1024 },
// });

// function buildFileUrl(filePath) {
//     const base = process.env.BACKEND_URL || 'http://localhost:5000';
//     return `${base}${filePath}`;
// }

// module.exports = { uploadPDF, uploadImage, buildFileUrl, UPLOAD_BASE };

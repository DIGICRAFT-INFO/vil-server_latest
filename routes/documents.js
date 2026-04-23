const express  = require('express');
const router   = express.Router();
const Document = require('../models/Document');
const { protect, adminOnly } = require('../middleware/auth');
const { uploadPDF, buildFileUrl } = require('../middleware/upload');

// Error Handler Wrapper
function handleUpload(multerMiddleware) {
    return (req, res, next) => {
        multerMiddleware(req, res, (err) => {
            if (!err) return next();
            res.status(400).json({ success: false, message: err.message });
        });
    };
}

// @route   POST /api/documents
// @desc    Upload PDF and save to DB
router.post('/', protect, adminOnly, handleUpload(uploadPDF.single('pdf')), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'File upload failed.' });
        }

        const { title, category, year, quarter, description } = req.body;

        // Path format jo DB mein jayega
        const relativePath = `/uploads/documents/${category || 'others'}/${req.file.filename}`;
        const fullPublicUrl = buildFileUrl(relativePath);

        const newDoc = await Document.create({
            title,
            category: category || 'others',
            year,
            quarter,
            description,
            fileName: req.file.originalname,
            filePath: relativePath,    // Local storage path
            fileUrl: fullPublicUrl,    // Full clickable link
            fileSize: req.file.size,
            uploadedBy: req.user._id
        });

        res.status(201).json({ 
            success: true, 
            message: 'Document uploaded successfully',
            document: newDoc 
        });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @route   GET /api/documents
// @desc    Get all docs (Fast retrieval with lean)
router.get('/', async (req, res) => {
    try {
        const { category } = req.query;
        const filter = { isActive: true };
        if (category) filter.category = category;

        const docs = await Document.find(filter)
            .sort({ createdAt: -1 })
            .lean(); // Fast performance for frontend

        res.json({ success: true, documents: docs });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;




// const express  = require('express');
// const router   = express.Router();
// const path     = require('path');
// const fs       = require('fs');
// const Document = require('../models/Document');
// const { protect, adminOnly } = require('../middleware/auth');
// const { uploadPDF, buildLocalUrl } = require('../middleware/upload');

// // Multer error handler
// function handleUpload(multerMiddleware) {
//     return (req, res, next) => {
//         multerMiddleware(req, res, (err) => {
//             if (!err) return next();
//             res.status(400).json({ success: false, message: err.message });
//         });
//     };
// }

// // GET All Documents
// router.get('/', async (req, res) => {
//     try {
//         const { category, search } = req.query;
//         const query = { isActive: true };
//         if (category) query.category = category;
//         if (search) query.title = { $regex: search, $options: 'i' };

//         const docs = await Document.find(query).sort({ createdAt: -1 });
//         res.json({ success: true, documents: docs });
//     } catch (err) {
//         res.status(500).json({ success: false, message: err.message });
//     }
// });

// // POST Create Document (DYNAMIC STORAGE FIX)
// router.post('/', protect, adminOnly, handleUpload(uploadPDF.single('pdf')), async (req, res) => {
//     try {
//         if (!req.file) return res.status(400).json({ success: false, message: 'No PDF uploaded.' });

//         const isCloud = process.env.STORAGE_MODE === 'cloudinary';
        
//         // Agar Cloudinary hai toh req.file.path poora URL hota hai (https://res.cloudinary.com/...)
//         const fileUrl = isCloud ? req.file.path : buildLocalUrl(req.body.category, req.file.filename);
//         const filePath = isCloud ? req.file.path : `/uploads/documents/${req.body.category}/${req.file.filename}`;

//         const doc = await Document.create({
//             ...req.body,
//             fileName: req.file.originalname,
//             filePath: filePath,
//             fileUrl: fileUrl,
//             fileSize: req.file.size,
//             uploadedBy: req.user._id
//         });

//         res.status(201).json({ success: true, document: doc });
//     } catch (err) {
//         res.status(500).json({ success: false, message: err.message });
//     }
// });

// // DELETE Document
// router.delete('/:id', protect, adminOnly, async (req, res) => {
//     try {
//         const doc = await Document.findById(req.params.id);
//         if (!doc) return res.status(404).json({ success: false, message: 'Not found' });

//         // Delete local file only
//         if (process.env.STORAGE_MODE !== 'cloudinary' && !doc.fileUrl.startsWith('http')) {
//             const fullPath = path.join(__dirname, '../public', doc.filePath);
//             if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
//         }

//         await Document.findByIdAndDelete(req.params.id);
//         res.json({ success: true, message: 'Deleted successfully' });
//     } catch (err) {
//         res.status(500).json({ success: false, message: err.message });
//     }
// });

// module.exports = router;

const express  = require('express');
const router   = express.Router();
const path     = require('path');
const fs       = require('fs');
const Document = require('../models/Document');
const { protect, adminOnly } = require('../middleware/auth');
const { uploadPDF, buildLocalUrl } = require('../middleware/upload');

// Multer error handler
function handleUpload(multerMiddleware) {
    return (req, res, next) => {
        multerMiddleware(req, res, (err) => {
            if (!err) return next();
            res.status(400).json({ success: false, message: err.message });
        });
    };
}

// GET All Documents
router.get('/', async (req, res) => {
    try {
        const { category, search } = req.query;
        const query = { isActive: true };
        if (category) query.category = category;
        if (search) query.title = { $regex: search, $options: 'i' };

        const docs = await Document.find(query).sort({ createdAt: -1 });
        res.json({ success: true, documents: docs });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST Create Document (DYNAMIC STORAGE FIX)
router.post('/', protect, adminOnly, handleUpload(uploadPDF.single('pdf')), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'No PDF uploaded.' });

        const isCloud = process.env.STORAGE_MODE === 'cloudinary';
        
        // Agar Cloudinary hai toh req.file.path poora URL hota hai (https://res.cloudinary.com/...)
        const fileUrl = isCloud ? req.file.path : buildLocalUrl(req.body.category, req.file.filename);
        const filePath = isCloud ? req.file.path : `/uploads/documents/${req.body.category}/${req.file.filename}`;

        const doc = await Document.create({
            ...req.body,
            fileName: req.file.originalname,
            filePath: filePath,
            fileUrl: fileUrl,
            fileSize: req.file.size,
            uploadedBy: req.user._id
        });

        res.status(201).json({ success: true, document: doc });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE Document
router.delete('/:id', protect, adminOnly, async (req, res) => {
    try {
        const doc = await Document.findById(req.params.id);
        if (!doc) return res.status(404).json({ success: false, message: 'Not found' });

        // Delete local file only
        if (process.env.STORAGE_MODE !== 'cloudinary' && !doc.fileUrl.startsWith('http')) {
            const fullPath = path.join(__dirname, '../public', doc.filePath);
            if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
        }

        await Document.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;

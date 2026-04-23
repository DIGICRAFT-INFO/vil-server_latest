const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const Document = require('../models/Document');
const { protect, adminOnly } = require('../middleware/auth');
const { uploadPDF, buildFileUrl } = require('../middleware/upload');

// Error Handler Wrapper for Multer
function handleUpload(multerMiddleware) {
    return (req, res, next) => {
        multerMiddleware(req, res, (err) => {
            if (!err) return next();
            res.status(400).json({ success: false, message: err.message });
        });
    };
}

// @route   GET /api/documents
// @desc    Get all docs with search and category filters
router.get('/', async (req, res) => {
    try {
        const { category, search } = req.query;
        const filter = { isActive: true };
        
        if (category) filter.category = category;
        if (search) filter.title = { $regex: search, $options: 'i' };

        const docs = await Document.find(filter)
            .sort({ createdAt: -1 })
            .lean();

        res.json({ success: true, documents: docs });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @route   POST /api/documents
// @desc    Upload PDF (Handles Local or Cloudinary based on STORAGE_MODE)
router.post('/', protect, adminOnly, handleUpload(uploadPDF.single('pdf')), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'File upload failed.' });
        }

        const { title, category, year, quarter, description } = req.body;
        const isCloud = process.env.STORAGE_MODE === 'cloudinary';

        // Logic to determine paths based on storage environment
        // In Cloudinary, req.file.path is the full URL. In Local, it is a filename.
        const fileUrl = isCloud ? req.file.path : buildFileUrl(`/uploads/documents/${category || 'others'}/${req.file.filename}`);
        const filePath = isCloud ? req.file.path : `/uploads/documents/${category || 'others'}/${req.file.filename}`;

        const newDoc = await Document.create({
            title,
            category: category || 'others',
            year,
            quarter,
            description,
            fileName: req.file.originalname,
            filePath: filePath, // Used for local deletion/tracking
            fileUrl: fileUrl,   // The link sent to the frontend
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

// @route   DELETE /api/documents/:id
// @desc    Delete document from DB and local storage (if applicable)
router.delete('/:id', protect, adminOnly, async (req, res) => {
    try {
        const doc = await Document.findById(req.params.id);
        
        if (!doc) {
            return res.status(404).json({ success: false, message: 'Document not found' });
        }

        // Only attempt local file deletion if NOT using Cloudinary
        // and if the file is stored locally in the public folder
        if (process.env.STORAGE_MODE !== 'cloudinary') {
            const absolutePath = path.join(__dirname, '../public', doc.filePath);
            
            // Check if file exists before trying to delete (Avoids 500 errors on Render)
            if (fs.existsSync(absolutePath)) {
                try {
                    fs.unlinkSync(absolutePath);
                } catch (fileErr) {
                    console.error(`Failed to delete physical file: ${fileErr.message}`);
                }
            }
        }

        // If you need to delete from Cloudinary, add cloudinary.v2.uploader.destroy logic here

        await Document.findByIdAndDelete(req.params.id);

        res.json({ success: true, message: 'Document deleted successfully' });
    } catch (err) {
        console.error(`Delete Error: ${err.message}`);
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;

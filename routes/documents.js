const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const Document = require('../models/Document');
const { protect, adminOnly } = require('../middleware/auth');
const { uploadPDF } = require('../middleware/upload');

// Error Handler Wrapper for Multer
function handleUpload(multerMiddleware) {
    return (req, res, next) => {
        multerMiddleware(req, res, (err) => {
            if (!err) return next();
            res.status(400).json({ success: false, message: err.message });
        });
    };
}

// @route   POST /api/documents
// @desc    Upload PDF with ID-based naming (Fixes long internal paths)
router.post('/', protect, adminOnly, handleUpload(uploadPDF.single('pdf')), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded.' });
        }

        const { title, category, year, quarter, description } = req.body;

        // 1. Create document first to get the MongoDB _id
        const newDoc = new Document({
            title,
            category: category || 'others',
            year,
            quarter,
            description,
            uploadedBy: req.user._id
        });

        // 2. ID-based File Naming (Taaki /opt/render/ jaise path na dikhein)
        const extension = path.extname(req.file.originalname);
        const cleanFileName = `${newDoc._id}${extension}`; // e.g. 69e9b...pdf
        const relativePath = `/uploads/documents/${category || 'others'}/${cleanFileName}`;
        const absolutePath = path.join(__dirname, '../public', relativePath);

        // Ensure target directory exists
        fs.mkdirSync(path.dirname(absolutePath), { recursive: true });

        // 3. Move file from temp to final destination with clean ID name
        fs.renameSync(req.file.path, absolutePath);

        // 4. Set URLs (Using BACKEND_URL from Hostinger/Render config)
        const domain = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
        
        newDoc.fileName = req.file.originalname;
        newDoc.filePath = relativePath;
        newDoc.fileUrl = `${domain}${relativePath}`; // Clean public link
        newDoc.fileSize = req.file.size;

        await newDoc.save();

        res.status(201).json({ 
            success: true, 
            message: 'Document uploaded successfully',
            document: newDoc 
        });

    } catch (err) {
        // Cleanup temp file if it exists and process fails
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        console.error(`Upload Error: ${err.message}`);
        res.status(500).json({ success: false, message: err.message });
    }
});

// @route   GET /api/documents
// @desc    Get documents (Clean retrieval for frontend)
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

// @route   DELETE /api/documents/:id
router.delete('/:id', protect, adminOnly, async (req, res) => {
    try {
        const doc = await Document.findById(req.params.id);
        if (!doc) return res.status(404).json({ success: false, message: 'Not found' });

        // Safe local deletion
        const absolutePath = path.join(__dirname, '../public', doc.filePath);
        if (fs.existsSync(absolutePath)) {
            try {
                fs.unlinkSync(absolutePath);
            } catch (e) {
                console.error("File deletion failed, continuing with DB removal");
            }
        }

        await Document.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;

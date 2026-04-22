/**
 * Documents (PDF) Routes
 * - Upload, list, fetch, delete PDFs
 * - Supports Local Storage and Cloudinary dynamically
 */
const express  = require('express');
const router   = express.Router();
const path     = require('path');
const fs       = require('fs');
const Document = require('../models/Document');
const { protect, adminOnly }                      = require('../middleware/auth');
const { uploadPDF, buildLocalUrl, UPLOAD_BASE }   = require('../middleware/upload');

// ── Multer error wrapper to catch size limits
function handleUpload(multerMiddleware) {
  return (req, res, next) => {
    multerMiddleware(req, res, (err) => {
      if (!err) return next();
      if (err.code === 'LIMIT_FILE_SIZE') {
        const max = process.env.MAX_PDF_SIZE_MB || 50;
        return res.status(400).json({ success: false, message: `File too large. Max size: ${max}MB.` });
      }
      return res.status(400).json({ success: false, message: err.message || 'File upload error.' });
    });
  };
}

// ─────────────────────────────────────────────
// PUBLIC ROUTES
// ─────────────────────────────────────────────

// GET /api/documents — List all documents with filters
router.get('/', async (req, res) => {
  try {
    const { category, year, quarter, search, limit = 500, page = 1 } = req.query;
    const query = { isActive: true };
    
    if (category) query.category = category;
    if (year)      query.year     = year;
    if (quarter)   query.quarter  = quarter;
    if (search)    query.$or = [
      { title:    { $regex: search, $options: 'i' } },
      { fileName: { $regex: search, $options: 'i' } },
    ];

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await Document.countDocuments(query);
    const docs  = await Document.find(query)
      .sort({ year: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('uploadedBy', 'name');

    res.json({ success: true, count: total, documents: docs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/documents/by-category — Returns grouped documents
router.get('/by-category', async (req, res) => {
  try {
    const docs = await Document.find({ isActive: true }).sort({ year: -1, createdAt: -1 });
    const grouped = {};
    docs.forEach(doc => {
      if (!grouped[doc.category]) grouped[doc.category] = [];
      grouped[doc.category].push(doc);
    });
    res.json({ success: true, data: grouped });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/documents/:id — Get single document
router.get('/:id', async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id).populate('uploadedBy', 'name');
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found.' });
    res.json({ success: true, document: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────
// ADMIN ROUTES
// ─────────────────────────────────────────────

// POST /api/documents — Upload PDF (HANDLES STORAGE MODES)
router.post('/', protect, adminOnly, handleUpload(uploadPDF.single('pdf')), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No PDF file uploaded.' });

    const { title, category, subcategory, year, quarter, description } = req.body;
    if (!title || !category) {
      return res.status(400).json({ success: false, message: 'Title and Category are required.' });
    }

    // Determine storage mode (Cloudinary vs Local)
    const isCloudinary = process.env.STORAGE_MODE === 'cloudinary';
    
    let fileUrl, filePath;

    if (isCloudinary) {
      // Use the direct Cloudinary URL from req.file.path
      fileUrl = req.file.path; 
      filePath = req.file.path; 
    } else {
      // Local mode: Ensure clean relative paths to avoid internal server errors
      const cleanFileName = req.file.filename;
      fileUrl = buildLocalUrl(category, cleanFileName, 'documents');
      filePath = `/uploads/documents/${category}/${cleanFileName}`;
    }

    const doc = await Document.create({
      title,
      fileName:    req.file.originalname,
      filePath,    
      fileUrl,     
      category,
      subcategory: subcategory || '',
      year:        year        || '',
      quarter:     quarter     || '',
      description: description || '',
      fileSize:    req.file.size,
      uploadedBy:  req.user._id,
    });

    res.status(201).json({ success: true, document: doc });
  } catch (err) {
    console.error("Upload Error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/documents/:id — Update metadata
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const allowed = ['title', 'category', 'subcategory', 'year', 'quarter', 'description', 'isActive'];
    const update  = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
    
    const doc = await Document.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found.' });
    
    res.json({ success: true, document: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/documents/:id — Delete record and physical file (if local)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found.' });

    // Delete physical file ONLY if stored locally
    if (process.env.STORAGE_MODE !== 'cloudinary' && doc.filePath) {
      // Clean path check: ensure we are looking inside public/uploads
      const relativePath = doc.filePath.startsWith('/') ? doc.filePath : `/${doc.filePath}`;
      const fullPath = path.join(__dirname, '../public', relativePath);
      
      if (fs.existsSync(fullPath)) {
        try { fs.unlinkSync(fullPath); } catch (e) { console.error("File unlink error:", e.message); }
      }
    }

    await Document.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Document deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

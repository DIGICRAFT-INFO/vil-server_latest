/**
 * Documents (PDF) Routes
 * - Upload, list, fetch, delete PDFs
 * - Files stored in public/uploads/documents/{category}/
 * - All URLs built from BACKEND_URL env var
 */
const express  = require('express');
const router   = express.Router();
const path     = require('path');
const fs       = require('fs');
const Document = require('../models/Document');
const { protect, adminOnly }                      = require('../middleware/auth');
const { uploadPDF, buildLocalUrl, UPLOAD_BASE }   = require('../middleware/upload');

// ── Multer error wrapper
function handleUpload(multerMiddleware) {
  return (req, res, next) => {
    multerMiddleware(req, res, (err) => {
      if (!err) return next();
      if (err.code === 'LIMIT_FILE_SIZE') {
        const max = process.env.MAX_PDF_SIZE_MB || 50;
        return res.status(400).json({ success: false, message: `File too large. Maximum size is ${max} MB.` });
      }
      return res.status(400).json({ success: false, message: err.message || 'File upload error.' });
    });
  };
}

// ─────────────────────────────────────────────
// PUBLIC ROUTES
// ─────────────────────────────────────────────

// GET /api/documents — list all (filterable)
router.get('/', async (req, res) => {
  try {
    const { category, year, quarter, search, limit = 500, page = 1 } = req.query;
    const query = { isActive: true };
    if (category) query.category = category;
    if (year)     query.year     = year;
    if (quarter)  query.quarter  = quarter;
    if (search)   query.$or = [
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

// GET /api/documents/by-category — grouped object { category: [docs] }
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

// GET /api/documents/folders — list physical folders + file counts
router.get('/folders', async (req, res) => {
  try {
    const docsDir = path.join(UPLOAD_BASE, 'documents');
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
    const result = {};

    if (fs.existsSync(docsDir)) {
      const folders = fs.readdirSync(docsDir, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);

      folders.forEach(folder => {
        const folderPath = path.join(docsDir, folder);
        const files = fs.readdirSync(folderPath)
          .filter(f => f.endsWith('.pdf') && f !== '.gitkeep')
          .map(f => ({
            filename: f,
            url:      `${backendUrl}/uploads/documents/${folder}/${encodeURIComponent(f)}`,
            size:     fs.statSync(path.join(folderPath, f)).size,
          }));
        result[folder] = files;
      });
    }

    res.json({ success: true, folders: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/documents/slug/:slug — by SEO slug
router.get('/slug/:slug', async (req, res) => {
  try {
    const doc = await Document.findOne({ slug: req.params.slug, isActive: true });
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found.' });
    doc.downloadCount = (doc.downloadCount || 0) + 1;
    await doc.save();
    res.json({ success: true, document: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/documents/:id
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

// POST /api/documents — upload PDF
router.post('/', protect, adminOnly, handleUpload(uploadPDF.single('pdf')), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No PDF file uploaded.' });

    const { title, category, subcategory, year, quarter, description } = req.body;
    if (!title)    return res.status(400).json({ success: false, message: 'Title is required.' });
    if (!category) return res.status(400).json({ success: false, message: 'Category is required.' });

    const fileUrl  = buildLocalUrl(category, req.file.filename, 'documents');
    const filePath = `/uploads/documents/${category}/${req.file.filename}`;

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
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/documents/:id — update metadata
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const allowed = ['title', 'category', 'subcategory', 'year', 'quarter', 'description', 'isActive'];
    const update  = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
    const doc     = await Document.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found.' });
    res.json({ success: true, document: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/documents/:id — delete record + physical file
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found.' });

    // Delete physical file
    if (doc.filePath) {
      const fullPath = path.join(__dirname, '../public', doc.filePath);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }

    await Document.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Document deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

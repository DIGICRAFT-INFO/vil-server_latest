const express = require('express');
const router  = express.Router();
const { News }                         = require('../models/index');
const { protect, adminOnly }           = require('../middleware/auth');
const { uploadImage, buildLocalUrl, usingCloudinary } = require('../middleware/upload');

function multerWrap(mw) {
  return (req, res, next) => mw(req, res, err => err ? res.status(400).json({ success: false, message: err.message }) : next());
}

// GET /api/news
router.get('/', async (req, res) => {
  try {
    const { category, limit = 10, page = 1 } = req.query;
    const query = { isPublished: true };
    if (category) query.category = category;
    const total = await News.countDocuments(query);
    const news  = await News.find(query)
      .sort('-publishedAt')
      .skip((+page - 1) * +limit)
      .limit(+limit);
    res.json({ success: true, count: total, pages: Math.ceil(total / +limit), news });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /api/news/admin/all — Admin: see drafts too
router.get('/admin/all', protect, adminOnly, async (req, res) => {
  try {
    const news = await News.find().sort('-createdAt').limit(500);
    res.json({ success: true, count: news.length, news });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /api/news/:slug
router.get('/:slug', async (req, res) => {
  try {
    const item = await News.findOne({ slug: req.params.slug });
    if (!item) return res.status(404).json({ success: false, message: 'Article not found.' });
    item.views = (item.views || 0) + 1;
    await item.save();
    res.json({ success: true, news: item });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// POST /api/news
router.post('/', protect, adminOnly, multerWrap(uploadImage.single('image')), async (req, res) => {
  try {
    const data = { ...req.body, uploadedBy: req.user._id };
    if (req.file) {
      data.image = usingCloudinary
        ? (req.file.path || req.file.secure_url)
        : buildLocalUrl('', req.file.filename, 'images');
    }
    if (data.tags && typeof data.tags === 'string') {
      data.tags = data.tags.split(',').map(t => t.trim()).filter(Boolean);
    }
    const item = await News.create(data);
    res.status(201).json({ success: true, news: item });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// PUT /api/news/:id
router.put('/:id', protect, adminOnly, multerWrap(uploadImage.single('image')), async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.file) {
      data.image = usingCloudinary
        ? (req.file.path || req.file.secure_url)
        : buildLocalUrl('', req.file.filename, 'images');
    }
    if (data.tags && typeof data.tags === 'string') {
      data.tags = data.tags.split(',').map(t => t.trim()).filter(Boolean);
    }
    const item = await News.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ success: false, message: 'Article not found.' });
    res.json({ success: true, news: item });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// DELETE /api/news/:id
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const item = await News.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Article not found.' });
    res.json({ success: true, message: 'Deleted.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;

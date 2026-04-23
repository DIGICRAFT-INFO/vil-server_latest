const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { News } = require('../models/index');
const { protect, adminOnly } = require('../middleware/auth');
const { uploadImage, usingCloudinary } = require('../middleware/upload');

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
    const news = await News.find(query)
      .sort('-publishedAt')
      .skip((+page - 1) * +limit)
      .limit(+limit);
    res.json({ success: true, count: total, pages: Math.ceil(total / +limit), news });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /api/news/admin/all
router.get('/admin/all', protect, adminOnly, async (req, res) => {
  try {
    const news = await News.find().sort('-createdAt').limit(500);
    res.json({ success: true, count: news.length, news });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// POST /api/news
router.post('/', protect, adminOnly, multerWrap(uploadImage.single('image')), async (req, res) => {
  try {
    const data = { ...req.body, uploadedBy: req.user._id };

    if (req.file) {
      if (usingCloudinary) {
        data.image = req.file.path || req.file.secure_url;
      } else {
        // LOCAL STORAGE FIX: Manually build the URL to avoid "buildLocalUrl is not a function"
        const domain = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
        const relativePath = `/uploads/images/${req.file.filename}`;
        data.image = `${domain}${relativePath}`;
      }
    }

    // Handle Tags safely
    if (data.tags) {
      try {
        // If frontend sends JSON string (like in my previous fix), parse it. 
        // If it's a plain comma string, split it.
        data.tags = typeof data.tags === 'string' && data.tags.startsWith('[') 
          ? JSON.parse(data.tags) 
          : String(data.tags).split(',').map(t => t.trim()).filter(Boolean);
      } catch (e) {
        data.tags = String(data.tags).split(',').map(t => t.trim()).filter(Boolean);
      }
    }

    const item = await News.create(data);
    res.status(201).json({ success: true, news: item });
  } catch (err) { 
    console.error("News POST Error:", err);
    res.status(500).json({ success: false, message: err.message }); 
  }
});

// PUT /api/news/:id
router.put('/:id', protect, adminOnly, multerWrap(uploadImage.single('image')), async (req, res) => {
  try {
    const data = { ...req.body };
    
    if (req.file) {
      if (usingCloudinary) {
        data.image = req.file.path || req.file.secure_url;
      } else {
        const domain = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
        const relativePath = `/uploads/images/${req.file.filename}`;
        data.image = `${domain}${relativePath}`;
      }
    }

    if (data.tags) {
      try {
        data.tags = typeof data.tags === 'string' && data.tags.startsWith('[') 
          ? JSON.parse(data.tags) 
          : String(data.tags).split(',').map(t => t.trim()).filter(Boolean);
      } catch (e) {
        data.tags = String(data.tags).split(',').map(t => t.trim()).filter(Boolean);
      }
    }

    const item = await News.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ success: false, message: 'Article not found.' });
    res.json({ success: true, news: item });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// DELETE /api/news/:id
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const item = await News.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Article not found.' });

    // Clean up local image file if it exists
    if (!usingCloudinary && item.image && item.image.includes('/uploads/')) {
      const filename = item.image.split('/').pop();
      const filePath = path.join(__dirname, '../public/uploads/images', filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await News.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;









// const express = require('express');
// const router  = express.Router();
// const { News }                         = require('../models/index');
// const { protect, adminOnly }           = require('../middleware/auth');
// const { uploadImage, buildLocalUrl, usingCloudinary } = require('../middleware/upload');

// function multerWrap(mw) {
//   return (req, res, next) => mw(req, res, err => err ? res.status(400).json({ success: false, message: err.message }) : next());
// }

// // GET /api/news
// router.get('/', async (req, res) => {
//   try {
//     const { category, limit = 10, page = 1 } = req.query;
//     const query = { isPublished: true };
//     if (category) query.category = category;
//     const total = await News.countDocuments(query);
//     const news  = await News.find(query)
//       .sort('-publishedAt')
//       .skip((+page - 1) * +limit)
//       .limit(+limit);
//     res.json({ success: true, count: total, pages: Math.ceil(total / +limit), news });
//   } catch (err) { res.status(500).json({ success: false, message: err.message }); }
// });

// // GET /api/news/admin/all — Admin: see drafts too
// router.get('/admin/all', protect, adminOnly, async (req, res) => {
//   try {
//     const news = await News.find().sort('-createdAt').limit(500);
//     res.json({ success: true, count: news.length, news });
//   } catch (err) { res.status(500).json({ success: false, message: err.message }); }
// });

// // GET /api/news/:slug
// router.get('/:slug', async (req, res) => {
//   try {
//     const item = await News.findOne({ slug: req.params.slug });
//     if (!item) return res.status(404).json({ success: false, message: 'Article not found.' });
//     item.views = (item.views || 0) + 1;
//     await item.save();
//     res.json({ success: true, news: item });
//   } catch (err) { res.status(500).json({ success: false, message: err.message }); }
// });

// // POST /api/news
// router.post('/', protect, adminOnly, multerWrap(uploadImage.single('image')), async (req, res) => {
//   try {
//     const data = { ...req.body, uploadedBy: req.user._id };
//     if (req.file) {
//       data.image = usingCloudinary
//         ? (req.file.path || req.file.secure_url)
//         : buildLocalUrl('', req.file.filename, 'images');
//     }
//     if (data.tags && typeof data.tags === 'string') {
//       data.tags = data.tags.split(',').map(t => t.trim()).filter(Boolean);
//     }
//     const item = await News.create(data);
//     res.status(201).json({ success: true, news: item });
//   } catch (err) { res.status(500).json({ success: false, message: err.message }); }
// });

// // PUT /api/news/:id
// router.put('/:id', protect, adminOnly, multerWrap(uploadImage.single('image')), async (req, res) => {
//   try {
//     const data = { ...req.body };
//     if (req.file) {
//       data.image = usingCloudinary
//         ? (req.file.path || req.file.secure_url)
//         : buildLocalUrl('', req.file.filename, 'images');
//     }
//     if (data.tags && typeof data.tags === 'string') {
//       data.tags = data.tags.split(',').map(t => t.trim()).filter(Boolean);
//     }
//     const item = await News.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
//     if (!item) return res.status(404).json({ success: false, message: 'Article not found.' });
//     res.json({ success: true, news: item });
//   } catch (err) { res.status(500).json({ success: false, message: err.message }); }
// });

// // DELETE /api/news/:id
// router.delete('/:id', protect, adminOnly, async (req, res) => {
//   try {
//     const item = await News.findByIdAndDelete(req.params.id);
//     if (!item) return res.status(404).json({ success: false, message: 'Article not found.' });
//     res.json({ success: true, message: 'Deleted.' });
//   } catch (err) { res.status(500).json({ success: false, message: err.message }); }
// });

// module.exports = router;

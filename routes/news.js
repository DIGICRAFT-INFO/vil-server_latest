const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { News } = require('../models/index');
const { protect, adminOnly } = require('../middleware/auth');
const { uploadImage, usingCloudinary } = require('../middleware/upload');

// Helper to handle Multer errors
function multerWrap(mw) {
  return (req, res, next) => mw(req, res, err => err ? res.status(400).json({ success: false, message: err.message }) : next());
}

// ==========================================
// 1. CREATE NEWS (POST)
// ==========================================
router.post('/', protect, adminOnly, multerWrap(uploadImage.single('image')), async (req, res) => {
  try {
    const data = { ...req.body, uploadedBy: req.user._id };
    const newItem = new News(data);

    if (req.file) {
      if (usingCloudinary) {
        newItem.image = req.file.path || req.file.secure_url;
      } else {
        const extension = path.extname(req.file.originalname);
        const cleanFileName = `${newItem._id}${extension}`;
        const relativePath = `/uploads/images/${cleanFileName}`;
        const absolutePath = path.join(__dirname, '../public', relativePath);

        fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
        fs.renameSync(req.file.path, absolutePath);

        const domain = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
        newItem.image = `${domain}${relativePath}`;
      }
    }

    if (data.tags) {
      newItem.tags = typeof data.tags === 'string' 
        ? data.tags.split(',').map(t => t.trim()).filter(Boolean)
        : data.tags;
    }

    await newItem.save();
    res.status(201).json({ success: true, news: newItem });
  } catch (err) { 
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ success: false, message: err.message }); 
  }
});

// ==========================================
// 2. UPDATE NEWS (PUT)
// ==========================================
router.put('/:id', protect, adminOnly, multerWrap(uploadImage.single('image')), async (req, res) => {
  try {
    const updateData = { ...req.body };
    const item = await News.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Not found' });

    if (req.file) {
      if (!usingCloudinary && item.image && item.image.includes('/uploads/images/')) {
        const oldFilename = item.image.split('/').pop();
        const oldPath = path.join(__dirname, '../public/uploads/images', oldFilename);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }

      if (usingCloudinary) {
        updateData.image = req.file.path || req.file.secure_url;
      } else {
        const extension = path.extname(req.file.originalname);
        const cleanFileName = `${item._id}${extension}`;
        const relativePath = `/uploads/images/${cleanFileName}`;
        const absolutePath = path.join(__dirname, '../public', relativePath);
        fs.renameSync(req.file.path, absolutePath);
        const domain = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
        updateData.image = `${domain}${relativePath}`;
      }
    }

    if (updateData.tags) {
      updateData.tags = typeof updateData.tags === 'string'
        ? updateData.tags.split(',').map(t => t.trim()).filter(Boolean)
        : updateData.tags;
    }

    const updatedItem = await News.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.json({ success: true, news: updatedItem });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ==========================================
// 3. GET ALL NEWS (PUBLIC)
// ==========================================
router.get('/', async (req, res) => {
  try {
    const { category, limit = 50, page = 1 } = req.query;
    const query = {}; // Admin side ke liye filter hataya taaki sab dikhe
    
    // Agar public side se category aa rahi ho toh filter karein
    if (category && category !== 'All') query.category = category;

    const news = await News.find(query)
      .sort('-createdAt')
      .skip((+page - 1) * +limit)
      .limit(+limit);
      
    res.json({ success: true, news });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ==========================================
// 4. GET SINGLE NEWS BY SLUG/ID (DETAILS PAGE)
// ==========================================
router.get('/:idOrSlug', async (req, res) => {
  try {
    let item = await News.findById(req.params.idOrSlug).catch(() => null);
    if (!item) {
      item = await News.findOne({ slug: req.params.idOrSlug });
    }

    if (!item) return res.status(404).json({ success: false, message: 'Article not found' });

    item.views = (item.views || 0) + 1;
    await item.save();

    res.json({ success: true, news: item });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ==========================================
// 5. DELETE NEWS (ADMIN ONLY)
// ==========================================
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const item = await News.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Article not found' });

    // Local image cleanup
    if (item.image && item.image.includes('/uploads/images/')) {
      const filename = item.image.split('/').pop();
      const filePath = path.join(__dirname, '../public/uploads/images', filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await News.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;

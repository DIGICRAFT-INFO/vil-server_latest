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

// @route   POST /api/news
// @desc    Create News with ID-based Image Naming
router.post('/', protect, adminOnly, multerWrap(uploadImage.single('image')), async (req, res) => {
  try {
    const data = { ...req.body, uploadedBy: req.user._id };
    
    // 1. Pehle document create karein ID lene ke liye
    const newItem = new News(data);

    if (req.file) {
      if (usingCloudinary) {
        newItem.image = req.file.path || req.file.secure_url;
      } else {
        // 2. ID-based Image Naming Logic (ID use karke rename)
        const extension = path.extname(req.file.originalname);
        const cleanFileName = `${newItem._id}${extension}`; // e.g. 69e9ba...jpg
        const relativePath = `/uploads/images/${cleanFileName}`;
        const absolutePath = path.join(__dirname, '../public', relativePath);

        // Ensure folder exists
        fs.mkdirSync(path.dirname(absolutePath), { recursive: true });

        // Temp file ko new ID-based name ke saath move karein
        fs.renameSync(req.file.path, absolutePath);

        // 3. Clean URL set karein
        const domain = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
        newItem.image = `${domain}${relativePath}`;
      }
    }

    // Handle Tags (Frontend se aane wala string/array handle karein)
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

// @route   PUT /api/news/:id
router.put('/:id', protect, adminOnly, multerWrap(uploadImage.single('image')), async (req, res) => {
  try {
    const updateData = { ...req.body };
    const item = await News.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Not found' });

    if (req.file) {
      if (usingCloudinary) {
        updateData.image = req.file.path || req.file.secure_url;
      } else {
        // Purani local image delete karein agar exist karti hai
        if (item.image && item.image.includes('/uploads/images/')) {
          const oldFilename = item.image.split('/').pop();
          const oldPath = path.join(__dirname, '../public/uploads/images', oldFilename);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }

        // New Image ID-based naming
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

// Baki GET aur DELETE routes purane code wale hi rahenge...
// ... (GET logic same as before)
router.get('/', async (req, res) => {
  try {
    const { category, limit = 10, page = 1 } = req.query;
    const query = { isPublished: true };
    if (category) query.category = category;
    const news = await News.find(query).sort('-publishedAt').skip((+page-1)*+limit).limit(+limit);
    res.json({ success: true, news });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { Product } = require('../models/index');
const { protect, adminOnly } = require('../middleware/auth');
const { uploadImage, usingCloudinary } = require('../middleware/upload');

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:5000';

// Helper for safe JSON parsing
const safeParse = (data) => {
  try { return typeof data === 'string' ? JSON.parse(data) : data; }
  catch (e) { return []; }
};

// ==========================================
// 1. GET ALL PRODUCTS
// ==========================================
router.get('/', async (req, res) => {
  try {
    const { admin } = req.query;
    // Admin ko saare dikhao, public ko sirf isActive
    const query = admin === 'true' ? {} : { isActive: true };
    const products = await Product.find(query).sort('order');
    res.json({ success: true, products });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ==========================================
// 2. GET SINGLE PRODUCT BY SLUG
// ==========================================
router.get('/:slug', async (req, res) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, product });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ==========================================
// 3. CREATE PRODUCT (POST)
// ==========================================
router.post('/', protect, adminOnly, uploadImage.array('images', 5), async (req, res) => {
  try {
    const data = { ...req.body };
    
    // Parse complex fields safely
    data.specifications = safeParse(req.body.specifications);
    data.specHeaders = safeParse(req.body.specHeaders);
    data.reactions = safeParse(req.body.reactions);

    const product = new Product(data);

    // Image Handling
    if (req.files && req.files.length > 0) {
      data.images = req.files.map(f => {
        if (usingCloudinary) return f.path || f.secure_url;
        return `${BASE_URL}/uploads/images/${f.filename}`;
      });
    }

    const newProduct = await Product.create(data);
    res.status(201).json({ success: true, product: newProduct });
  } catch (err) {
    // Cleanup uploaded files on error
    if (req.files) req.files.forEach(f => fs.existsSync(f.path) && fs.unlinkSync(f.path));
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 4. UPDATE PRODUCT (PUT)
// ==========================================
router.put('/:id', protect, adminOnly, uploadImage.array('images', 5), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const data = { ...req.body };
    data.specifications = safeParse(req.body.specifications);
    data.specHeaders = safeParse(req.body.specHeaders);
    data.reactions = safeParse(req.body.reactions);

    // Image Update Logic
    if (req.files && req.files.length > 0) {
      // 1. Purani local images delete karein (Optional: depend on your business logic)
      if (!usingCloudinary && product.images) {
        product.images.forEach(imgUrl => {
          const filename = imgUrl.split('/').pop();
          const oldPath = path.join(__dirname, '../public/uploads/images', filename);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        });
      }

      // 2. New images add karein
      data.images = req.files.map(f => {
        if (usingCloudinary) return f.path || f.secure_url;
        return `${BASE_URL}/uploads/images/${f.filename}`;
      });
    }

    const updatedProduct = await Product.findByIdAndUpdate(req.params.id, data, { new: true });
    res.json({ success: true, product: updatedProduct });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ==========================================
// 5. DELETE PRODUCT
// ==========================================
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Not found' });

    // Delete associated images from storage
    if (!usingCloudinary && product.images) {
      product.images.forEach(imgUrl => {
        const filename = imgUrl.split('/').pop();
        const filePath = path.join(__dirname, '../public/uploads/images', filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      });
    }

    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Product and associated images deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;

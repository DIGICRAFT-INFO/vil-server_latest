// products.js
const express = require('express');
const productRouter = express.Router();
const { Product } = require('../models/index');
const { protect, adminOnly } = require('../middleware/auth');
const { uploadImage } = require('../middleware/upload');
const BASE_URL = process.env.BACKEND_URL || 'http://localhost:5000';

productRouter.get('/', async (req, res) => {
  try {
    const products = await Product.find({ isActive: true }).sort('order');
    res.json({ success: true, products });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

productRouter.get('/:slug', async (req, res) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug, isActive: true });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, product });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

productRouter.post('/', protect, adminOnly, uploadImage.array('images', 5), async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.body.specifications) data.specifications = JSON.parse(req.body.specifications);
    if (req.body.specHeaders) data.specHeaders = JSON.parse(req.body.specHeaders);
    if (req.body.reactions) data.reactions = JSON.parse(req.body.reactions);
    if (req.files?.length) data.images = req.files.map(f => `${BASE_URL}/uploads/images/${f.filename}`);
    const product = await Product.create(data);
    res.status(201).json({ success: true, product });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

productRouter.put('/:id', protect, adminOnly, uploadImage.array('images', 5), async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.body.specifications) data.specifications = JSON.parse(req.body.specifications);
    if (req.body.specHeaders) data.specHeaders = JSON.parse(req.body.specHeaders);
    if (req.body.reactions) data.reactions = JSON.parse(req.body.reactions);
    if (req.files?.length) data.images = req.files.map(f => `${BASE_URL}/uploads/images/${f.filename}`);
    const product = await Product.findByIdAndUpdate(req.params.id, data, { new: true });
    res.json({ success: true, product });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

productRouter.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = productRouter;

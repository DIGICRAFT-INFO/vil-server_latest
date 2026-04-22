const express = require('express');
const router  = express.Router();
const { BoardMember }                  = require('../models/index');
const { protect, adminOnly }           = require('../middleware/auth');
const { uploadImage, buildLocalUrl, usingCloudinary } = require('../middleware/upload');

function multerWrap(mw) {
  return (req, res, next) => mw(req, res, err => err ? res.status(400).json({ success: false, message: err.message }) : next());
}

// GET /api/board-members
router.get('/', async (req, res) => {
  try {
    const members = await BoardMember.find({ isActive: true }).sort('order name');
    res.json({ success: true, members });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /api/board-members/committees
router.get('/committees', async (req, res) => {
  try {
    const members = await BoardMember.find({ isActive: true }).sort('order');
    const grouped = {};
    members.forEach(m => {
      (m.committees || []).forEach(c => {
        if (!grouped[c.name]) grouped[c.name] = [];
        grouped[c.name].push({ ...m.toObject(), committeeRole: c.role });
      });
    });
    res.json({ success: true, data: grouped });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// POST /api/board-members
router.post('/', protect, adminOnly, multerWrap(uploadImage.single('image')), async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.body.committees) {
      try { data.committees = JSON.parse(req.body.committees); } catch { data.committees = []; }
    }
    if (req.file) {
      data.image = usingCloudinary
        ? (req.file.path || req.file.secure_url)
        : buildLocalUrl('', req.file.filename, 'images');
    }
    const member = await BoardMember.create(data);
    res.status(201).json({ success: true, member });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// PUT /api/board-members/:id
router.put('/:id', protect, adminOnly, multerWrap(uploadImage.single('image')), async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.body.committees) {
      try { data.committees = JSON.parse(req.body.committees); } catch { data.committees = []; }
    }
    if (req.file) {
      data.image = usingCloudinary
        ? (req.file.path || req.file.secure_url)
        : buildLocalUrl('', req.file.filename, 'images');
    }
    const member = await BoardMember.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
    if (!member) return res.status(404).json({ success: false, message: 'Member not found.' });
    res.json({ success: true, member });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// DELETE /api/board-members/:id
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await BoardMember.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;

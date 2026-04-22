const express = require('express');
const router = express.Router();
const { Settings } = require('../models/index');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) settings = await Settings.create({});
    res.json({ success: true, settings });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/', protect, adminOnly, async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create(req.body);
    } else {
      settings = await Settings.findByIdAndUpdate(settings._id, req.body, { new: true });
    }
    res.json({ success: true, settings });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;

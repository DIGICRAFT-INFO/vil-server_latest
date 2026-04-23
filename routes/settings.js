const express = require('express');
const router = express.Router();
const { Settings } = require('../models/index');
const { protect, adminOnly } = require('../middleware/auth');

// ==========================================
// 1. GET SETTINGS (Public)
// ==========================================
router.get('/', async (req, res) => {
  try {
    // Optimization: findOne() ke saath lean() use karein fast retrieval ke liye
    let settings = await Settings.findOne().lean();
    
    // Agar settings exist nahi karti toh default create karein
    if (!settings) {
      settings = await Settings.create({
        siteName: 'Vaswani Industries Limited',
        maintenanceMode: false
      });
    }
    
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 2. UPDATE SETTINGS (Admin Only)
// ==========================================
router.put('/', protect, adminOnly, async (req, res) => {
  try {
    const updateData = req.body;
    
    // 1. Pehle document search karein
    let settings = await Settings.findOne();

    if (!settings) {
      // Agar setting record hi nahi hai toh naya banayein
      settings = await Settings.create(updateData);
    } else {
      // 2. Depth Analysis Fix: 
      // Direct update karne ke bajaye hum check karte hain ki 
      // partial data (jaise sirf phone update karna ho) se purana data na ude.
      // { new: true, runValidators: true } ensures data validity.
      settings = await Settings.findByIdAndUpdate(
        settings._id,
        { $set: updateData }, // $set use karein taaki sirf wahi fields change hon jo bheji gayi hain
        { new: true, runValidators: true, upsert: true }
      );
    }

    res.json({ 
      success: true, 
      message: 'Settings updated successfully',
      settings 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

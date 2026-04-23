const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { protect, adminOnly } = require('../middleware/auth');

// ==========================================
// 1. GET QUICK COUNT (Performance optimized)
// ==========================================
router.get('/count', protect, adminOnly, async (req, res) => {
  try {
    const count = await Notification.countDocuments({ isRead: false });
    res.json({ success: true, count });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ==========================================
// 2. READ ALL (Must be ABOVE /:id routes)
// ==========================================
router.put('/read-all', protect, adminOnly, async (req, res) => {
  try {
    await Notification.updateMany({ isRead: false }, { isRead: true });
    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ==========================================
// 3. CLEAR ALL READ (Must be ABOVE /:id routes)
// ==========================================
router.delete('/clear-all', protect, adminOnly, async (req, res) => {
  try {
    // Sirf wahi clear karein jo read ho chuki hain
    const result = await Notification.deleteMany({ isRead: true });
    res.json({ success: true, message: `${result.deletedCount} read notifications cleared.` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ==========================================
// 4. GET ALL NOTIFICATIONS (Paginated)
// ==========================================
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const { limit = 20, page = 1, unreadOnly } = req.query;
    const query = unreadOnly === 'true' ? { isRead: false } : {};

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ isRead: false });
    
    const notifications = await Notification.find(query)
      .sort('-createdAt') // Latest first
      .skip((+page - 1) * +limit)
      .limit(+limit);

    res.json({ 
      success: true, 
      notifications, 
      pagination: {
        total,
        unreadCount,
        currentPage: +page,
        totalPages: Math.ceil(total / +limit)
      }
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ==========================================
// 5. MARK SINGLE AS READ
// ==========================================
router.put('/:id/read', protect, adminOnly, async (req, res) => {
  try {
    const n = await Notification.findByIdAndUpdate(
      req.params.id, 
      { isRead: true }, 
      { new: true }
    );
    if (!n) return res.status(404).json({ success: false, message: 'Notification not found.' });
    res.json({ success: true, notification: n });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ==========================================
// 6. DELETE SINGLE
// ==========================================
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const n = await Notification.findByIdAndDelete(req.params.id);
    if (!n) return res.status(404).json({ success: false, message: 'Notification not found.' });
    res.json({ success: true, message: 'Deleted.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;

/**
 * Notifications Routes — full CRUD + real-time ready
 */
const express       = require('express');
const router        = express.Router();
const Notification  = require('../models/Notification');
const { protect, adminOnly } = require('../middleware/auth');

// GET /api/notifications — admin, paginated, unread first
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const { limit = 30, page = 1, unreadOnly } = req.query;
    const query = unreadOnly === 'true' ? { isRead: false } : {};
    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ isRead: false });
    const notifications = await Notification.find(query)
      .sort('-createdAt')
      .skip((+page - 1) * +limit)
      .limit(+limit);
    res.json({ success: true, notifications, total, unreadCount });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /api/notifications/count — quick unread count
router.get('/count', protect, adminOnly, async (req, res) => {
  try {
    const count = await Notification.countDocuments({ isRead: false });
    res.json({ success: true, count });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// PUT /api/notifications/:id/read
router.put('/:id/read', protect, adminOnly, async (req, res) => {
  try {
    const n = await Notification.findByIdAndUpdate(
      req.params.id, { isRead: true }, { new: true }
    );
    if (!n) return res.status(404).json({ success: false, message: 'Not found.' });
    res.json({ success: true, notification: n });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// PUT /api/notifications/read-all
router.put('/read-all', protect, adminOnly, async (req, res) => {
  try {
    await Notification.updateMany({ isRead: false }, { isRead: true });
    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// DELETE /api/notifications/:id
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// DELETE /api/notifications/clear-all
router.delete('/clear-all', protect, adminOnly, async (req, res) => {
  try {
    await Notification.deleteMany({ isRead: true });
    res.json({ success: true, message: 'Read notifications cleared.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;

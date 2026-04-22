const express      = require('express');
const router       = express.Router();
const { Contact }  = require('../models/index');
const Notification = require('../models/Notification');
const { protect, adminOnly } = require('../middleware/auth');

router.post('/', async (req, res) => {
  try {
    const contact = await Contact.create(req.body);
    // Fire notification
    await Notification.create({
      type: 'new_contact', icon: 'mail',
      title: `New message from ${contact.name}`,
      message: contact.subject || contact.message?.substring(0, 80) || '',
      link: '/dashboard/contacts',
      meta: { contactId: contact._id },
    });
    res.status(201).json({ success: true, message: 'Message sent successfully!' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const { isRead, limit = 50, page = 1 } = req.query;
    const query = {};
    if (isRead !== undefined) query.isRead = isRead === 'true';
    const total = await Contact.countDocuments(query);
    const unreadCount = await Contact.countDocuments({ isRead: false });
    const contacts = await Contact.find(query).sort('-createdAt').skip((+page-1)*+limit).limit(+limit);
    res.json({ success: true, contacts, total, unreadCount });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/:id/read', protect, adminOnly, async (req, res) => {
  try {
    await Contact.findByIdAndUpdate(req.params.id, { isRead: true });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Contact.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;

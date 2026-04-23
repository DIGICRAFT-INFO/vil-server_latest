const express = require('express');
const router = express.Router();
const { Contact } = require('../models/index');
const Notification = require('../models/Notification');
const { protect, adminOnly } = require('../middleware/auth');

// ==========================================
// 1. PUBLIC: POST MESSAGE (Submit Contact Form)
// ==========================================
router.post('/', async (req, res) => {
  try {
    const { name, email, subject, message, phone } = req.body;

    // Basic Validation
    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields (Name, Email, Message).' });
    }

    const contact = await Contact.create({
      name, email, subject, message, phone
    });

    // --- Fire Admin Notification ---
    try {
      await Notification.create({
        type: 'new_contact',
        icon: 'mail',
        title: `Contact: ${contact.name}`,
        message: contact.subject || message.substring(0, 60),
        link: `/dashboard/contacts`, // Admin panel link
        meta: { 
          contactId: contact._id,
          email: contact.email 
        },
      });
    } catch (notifErr) {
      console.error("Notification trigger failed:", notifErr.message);
      // Form submit hona chahiye bhale hi notification fail ho jaye
    }

    res.status(201).json({ success: true, message: 'Your message has been sent successfully!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 2. ADMIN: GET ALL MESSAGES (Paginated)
// ==========================================
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const { isRead, limit = 20, page = 1 } = req.query;
    const query = {};
    
    if (isRead !== undefined) query.isRead = isRead === 'true';

    const total = await Contact.countDocuments(query);
    const unreadCount = await Contact.countDocuments({ isRead: false });
    
    const contacts = await Contact.find(query)
      .sort('-createdAt') // New messages first
      .skip((+page - 1) * +limit)
      .limit(+limit);

    res.json({ 
      success: true, 
      contacts, 
      pagination: {
        total,
        unreadCount,
        currentPage: +page,
        totalPages: Math.ceil(total / +limit)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 3. ADMIN: MARK AS READ
// ==========================================
router.put('/:id/read', protect, adminOnly, async (req, res) => {
  try {
    const contact = await Contact.findByIdAndUpdate(
        req.params.id, 
        { isRead: true }, 
        { new: true }
    );
    
    if (!contact) return res.status(404).json({ success: false, message: 'Message not found.' });
    
    res.json({ success: true, contact });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 4. ADMIN: DELETE MESSAGE
// ==========================================
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const contact = await Contact.findByIdAndDelete(req.params.id);
    if (!contact) return res.status(404).json({ success: false, message: 'Message not found.' });
    
    res.json({ success: true, message: 'Contact message deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

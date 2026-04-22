/**
 * Notification Model
 * Tracks admin notifications: new contact, new job application, system alerts, etc.
 */
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['new_contact', 'new_application', 'new_document', 'system', 'page_updated', 'user_created'],
    required: true,
  },
  title:    { type: String, required: true },
  message:  { type: String, default: '' },
  link:     { type: String, default: '' },       // Admin route to navigate to
  icon:     { type: String, default: 'bell' },   // lucide icon name
  isRead:   { type: Boolean, default: false },
  readBy:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  meta:     { type: mongoose.Schema.Types.Mixed, default: {} }, // extra data
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);

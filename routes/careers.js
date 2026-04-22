const express      = require('express');
const router       = express.Router();
const { Career }   = require('../models/index');
const Notification = require('../models/Notification');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const jobs = await Career.find({ isActive: true }).select('-applications').sort('-createdAt');
    res.json({ success: true, jobs });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/admin/all', protect, adminOnly, async (req, res) => {
  try {
    const jobs = await Career.find().select('-applications').sort('-createdAt');
    res.json({ success: true, jobs });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const job = await Career.findById(req.params.id).select('-applications');
    if (!job) return res.status(404).json({ success: false, message: 'Not found.' });
    res.json({ success: true, job });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/:id/apply', async (req, res) => {
  try {
    const job = await Career.findById(req.params.id);
    if (!job || !job.isActive) return res.status(404).json({ success: false, message: 'Position not available.' });
    job.applications.push(req.body);
    await job.save();
    await Notification.create({
      type: 'new_application', icon: 'briefcase',
      title: `New application for "${job.title}"`,
      message: `${req.body.name} (${req.body.email}) applied`,
      link: '/dashboard/careers',
      meta: { jobId: job._id, applicantName: req.body.name },
    });
    res.json({ success: true, message: 'Application submitted successfully!' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const job = await Career.create(req.body);
    res.status(201).json({ success: true, job });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const job = await Career.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!job) return res.status(404).json({ success: false, message: 'Not found.' });
    res.json({ success: true, job });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/:id/applications', protect, adminOnly, async (req, res) => {
  try {
    const job = await Career.findById(req.params.id).select('title applications');
    res.json({ success: true, data: job });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Career.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;

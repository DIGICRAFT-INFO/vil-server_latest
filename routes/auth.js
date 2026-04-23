const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect, adminOnly, superAdminOnly } = require('../middleware/auth');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { 
    expiresIn: process.env.JWT_EXPIRE || '30d' 
});

// ==========================================
// 1. LOGIN
// ==========================================
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });
        
        const user = await User.findOne({ email }).select('+password');
        if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });
        
        if (!user.isActive) return res.status(401).json({ success: false, message: 'Account is deactivated' });
        
        const isMatch = await user.matchPassword(password);
        if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });
        
        res.json({
            success: true,
            token: generateToken(user._id),
            user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ==========================================
// 2. GET ME (Current User Info)
// ==========================================
router.get('/me', protect, (req, res) => {
    res.json({ success: true, user: req.user });
});

// ==========================================
// 3. UPDATE PROFILE (Fixes 404 Profile)
// ==========================================
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, email, avatar } = req.body;
    
    // Check if email is already taken by another user
    if (email !== req.user.email) {
        const emailExists = await User.findOne({ email });
        if (emailExists) return res.status(400).json({ success: false, message: 'Email already in use' });
    }

    const user = await User.findByIdAndUpdate(
        req.user._id, 
        { name, email, avatar }, 
        { new: true, runValidators: true }
    ).select('-password');

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 4. CHANGE PASSWORD
// ==========================================
router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ success: false, message: 'Both passwords required' });

    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.matchPassword(currentPassword);
    
    if (!isMatch) return res.status(400).json({ success: false, message: 'Current password incorrect' });
    
    user.password = newPassword;
    await user.save();
    
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 5. USER MANAGEMENT (SuperAdmin Only)
// ==========================================

// Register new Admin
router.post('/register', protect, superAdminOnly, async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ success: false, message: 'User already exists' });
        
        const user = await User.create({ name, email, password, role: role || 'admin', isActive: true });
        res.status(201).json({ success: true, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Get All Users
router.get('/users', protect, superAdminOnly, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort('-createdAt');
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete User
router.delete('/users/:id', protect, superAdminOnly, async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
        return res.status(400).json({ success: false, message: 'Cannot delete yourself' });
    }
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 6. SEED SUPERADMIN (Run once)
// ==========================================
router.get('/seed', async (req, res) => {
    try {
        const existing = await User.findOne({ email: 'admin@vaswaniindustries.com' });
        if (existing) return res.json({ success: false, message: 'Admin already exists' });
        
        await User.create({
            name: 'Super Admin',
            email: 'admin@vaswaniindustries.com',
            password: 'Admin@1234', // Yeh bcrypt automatically hash kar dega (Model middleware se)
            role: 'superadmin',
            isActive: true
        });
        
        res.json({ success: true, message: 'Superadmin created successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;

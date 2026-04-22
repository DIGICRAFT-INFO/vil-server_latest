const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect, adminOnly, superAdminOnly } = require('../middleware/auth');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { 
    expiresIn: process.env.JWT_EXPIRE || '30d' 
});

// @POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });
        
        const user = await User.findOne({ email }).select('+password');
        if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });
        
        // Check if user is active
        if (user.isActive === false) return res.status(401).json({ success: false, message: 'Account is deactivated' });
        
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

// @POST /api/auth/seed (RUN THIS ONCE IN BROWSER)
router.get('/seed', async (req, res) => {
    try {
        const existing = await User.findOne({ email: 'admin@vaswaniindustries.com' });
        if (existing) return res.json({ success: false, message: 'Admin already exists' });
        
        const admin = await User.create({
            name: 'Super Admin',
            email: 'admin@vaswaniindustries.com',
            password: 'Admin@1234',
            role: 'superadmin',
            isActive: true
        });
        
        res.json({ success: true, message: 'Superadmin created successfully', email: admin.email });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @GET /api/auth/me
router.get('/me', protect, (req, res) => {
    res.json({ success: true, user: req.user });
});

// @POST /api/auth/register
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

module.exports = router;




// const express = require('express');
// const router = express.Router();
// const jwt = require('jsonwebtoken');
// const User = require('../models/User');
// const { protect, adminOnly, superAdminOnly } = require('../middleware/auth');

// const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });

// // @POST /api/auth/login
// router.post('/login', async (req, res) => {
//   try {
//     const { email, password } = req.body;
//     if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });
    
//     const user = await User.findOne({ email });
//     if (!user || !user.isActive) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    
//     const isMatch = await user.matchPassword(password);
//     if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    
//     res.json({
//       success: true,
//       token: generateToken(user._id),
//       user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar }
//     });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// });

// // @GET /api/auth/me
// router.get('/me', protect, (req, res) => {
//   res.json({ success: true, user: req.user });
// });

// // @POST /api/auth/register - SuperAdmin only
// router.post('/register', protect, superAdminOnly, async (req, res) => {
//   try {
//     const { name, email, password, role } = req.body;
//     const existingUser = await User.findOne({ email });
//     if (existingUser) return res.status(400).json({ success: false, message: 'User already exists' });
    
//     const user = await User.create({ name, email, password, role: role || 'admin' });
//     res.status(201).json({ success: true, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// });

// // @PUT /api/auth/profile
// router.put('/profile', protect, async (req, res) => {
//   try {
//     const { name, email, avatar } = req.body;
//     const user = await User.findByIdAndUpdate(req.user._id, { name, email, avatar }, { new: true }).select('-password');
//     res.json({ success: true, user });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// });

// // @PUT /api/auth/change-password
// router.put('/change-password', protect, async (req, res) => {
//   try {
//     const { currentPassword, newPassword } = req.body;
//     const user = await User.findById(req.user._id);
//     const isMatch = await user.matchPassword(currentPassword);
//     if (!isMatch) return res.status(400).json({ success: false, message: 'Current password incorrect' });
//     user.password = newPassword;
//     await user.save();
//     res.json({ success: true, message: 'Password updated successfully' });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// });

// // @GET /api/auth/users - SuperAdmin only
// router.get('/users', protect, superAdminOnly, async (req, res) => {
//   try {
//     const users = await User.find().select('-password').sort('-createdAt');
//     res.json({ success: true, users });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// });

// // @DELETE /api/auth/users/:id - SuperAdmin only
// router.delete('/users/:id', protect, superAdminOnly, async (req, res) => {
//   try {
//     if (req.params.id === req.user._id.toString()) return res.status(400).json({ success: false, message: 'Cannot delete yourself' });
//     await User.findByIdAndDelete(req.params.id);
//     res.json({ success: true, message: 'User deleted' });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// });

// // Seed default superadmin (run once)
// router.post('/seed', async (req, res) => {
//   try {
//     const existing = await User.findOne({ email: 'admin@vaswaniindustries.com' });
//     if (existing) return res.json({ success: false, message: 'Admin already exists' });
//     const admin = await User.create({
//       name: 'Super Admin',
//       email: 'admin@vaswaniindustries.com',
//       password: 'Admin@1234',
//       role: 'superadmin'
//     });
//     res.json({ success: true, message: 'Superadmin created', email: admin.email });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// });

// module.exports = router;

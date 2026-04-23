const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { BoardMember } = require('../models/index');
const { protect, adminOnly } = require('../middleware/auth');
const { uploadImage, usingCloudinary } = require('../middleware/upload');

// Helper to handle Multer errors
function multerWrap(mw) {
  return (req, res, next) => mw(req, res, err => err ? res.status(400).json({ success: false, message: err.message }) : next());
}

// ==========================================
// 1. GET COMMITTEES (Important: ID route se pehle rakhein)
// ==========================================
router.get('/committees', async (req, res) => {
  try {
    const members = await BoardMember.find({ isActive: true }).sort('order');
    const grouped = {};
    members.forEach(m => {
      (m.committees || []).forEach(c => {
        if (!grouped[c.name]) grouped[c.name] = [];
        grouped[c.name].push({ ...m.toObject(), committeeRole: c.role });
      });
    });
    res.json({ success: true, data: grouped });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ==========================================
// 2. GET ALL MEMBERS
// ==========================================
router.get('/', async (req, res) => {
  try {
    // Admin side par saare members dikhne chahiye, public par sirf isActive
    const query = req.query.admin === 'true' ? {} : { isActive: true };
    const members = await BoardMember.find(query).sort('order name');
    res.json({ success: true, members });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ==========================================
// 3. CREATE MEMBER (POST)
// ==========================================
router.post('/', protect, adminOnly, multerWrap(uploadImage.single('image')), async (req, res) => {
  try {
    const data = { ...req.body };
    
    // Committee JSON Parse logic
    if (req.body.committees) {
      try { data.committees = JSON.parse(req.body.committees); } catch { data.committees = []; }
    }

    const member = new BoardMember(data);

    if (req.file) {
      if (usingCloudinary) {
        member.image = req.file.path || req.file.secure_url;
      } else {
        // ID-based Naming for consistency
        const extension = path.extname(req.file.originalname);
        const cleanFileName = `member_${member._id}${extension}`;
        const relativePath = `/uploads/images/${cleanFileName}`;
        const absolutePath = path.join(__dirname, '../public', relativePath);

        fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
        fs.renameSync(req.file.path, absolutePath);

        const domain = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
        member.image = `${domain}${relativePath}`;
      }
    }

    await member.save();
    res.status(201).json({ success: true, member });
  } catch (err) { 
    if (req.file && !usingCloudinary && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ success: false, message: err.message }); 
  }
});

// ==========================================
// 4. UPDATE MEMBER (PUT)
// ==========================================
router.put('/:id', protect, adminOnly, multerWrap(uploadImage.single('image')), async (req, res) => {
  try {
    const data = { ...req.body };
    const member = await BoardMember.findById(req.params.id);
    if (!member) return res.status(404).json({ success: false, message: 'Member not found.' });

    if (req.body.committees) {
      try { data.committees = JSON.parse(req.body.committees); } catch { data.committees = []; }
    }

    if (req.file) {
      // 1. Purani local image delete karein
      if (!usingCloudinary && member.image && member.image.includes('/uploads/images/')) {
        const oldFilename = member.image.split('/').pop();
        const oldPath = path.join(__dirname, '../public/uploads/images', oldFilename);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }

      // 2. New Image set karein
      if (usingCloudinary) {
        data.image = req.file.path || req.file.secure_url;
      } else {
        const extension = path.extname(req.file.originalname);
        const cleanFileName = `member_${member._id}${extension}`;
        const relativePath = `/uploads/images/${cleanFileName}`;
        const absolutePath = path.join(__dirname, '../public', relativePath);
        fs.renameSync(req.file.path, absolutePath);
        const domain = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
        data.image = `${domain}${relativePath}`;
      }
    }

    const updatedMember = await BoardMember.findByIdAndUpdate(req.params.id, data, { new: true });
    res.json({ success: true, member: updatedMember });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ==========================================
// 5. DELETE MEMBER
// ==========================================
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const member = await BoardMember.findById(req.params.id);
    if (!member) return res.status(404).json({ success: false, message: 'Not found.' });

    // File cleanup logic
    if (!usingCloudinary && member.image && member.image.includes('/uploads/images/')) {
      const filename = member.image.split('/').pop();
      const filePath = path.join(__dirname, '../public/uploads/images', filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await BoardMember.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted successfully.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;












// const express = require('express');
// const router  = express.Router();
// const { BoardMember }                  = require('../models/index');
// const { protect, adminOnly }           = require('../middleware/auth');
// const { uploadImage, buildLocalUrl, usingCloudinary } = require('../middleware/upload');

// function multerWrap(mw) {
//   return (req, res, next) => mw(req, res, err => err ? res.status(400).json({ success: false, message: err.message }) : next());
// }

// // GET /api/board-members
// router.get('/', async (req, res) => {
//   try {
//     const members = await BoardMember.find({ isActive: true }).sort('order name');
//     res.json({ success: true, members });
//   } catch (err) { res.status(500).json({ success: false, message: err.message }); }
// });

// // GET /api/board-members/committees
// router.get('/committees', async (req, res) => {
//   try {
//     const members = await BoardMember.find({ isActive: true }).sort('order');
//     const grouped = {};
//     members.forEach(m => {
//       (m.committees || []).forEach(c => {
//         if (!grouped[c.name]) grouped[c.name] = [];
//         grouped[c.name].push({ ...m.toObject(), committeeRole: c.role });
//       });
//     });
//     res.json({ success: true, data: grouped });
//   } catch (err) { res.status(500).json({ success: false, message: err.message }); }
// });

// // POST /api/board-members
// router.post('/', protect, adminOnly, multerWrap(uploadImage.single('image')), async (req, res) => {
//   try {
//     const data = { ...req.body };
//     if (req.body.committees) {
//       try { data.committees = JSON.parse(req.body.committees); } catch { data.committees = []; }
//     }
//     if (req.file) {
//       data.image = usingCloudinary
//         ? (req.file.path || req.file.secure_url)
//         : buildLocalUrl('', req.file.filename, 'images');
//     }
//     const member = await BoardMember.create(data);
//     res.status(201).json({ success: true, member });
//   } catch (err) { res.status(500).json({ success: false, message: err.message }); }
// });

// // PUT /api/board-members/:id
// router.put('/:id', protect, adminOnly, multerWrap(uploadImage.single('image')), async (req, res) => {
//   try {
//     const data = { ...req.body };
//     if (req.body.committees) {
//       try { data.committees = JSON.parse(req.body.committees); } catch { data.committees = []; }
//     }
//     if (req.file) {
//       data.image = usingCloudinary
//         ? (req.file.path || req.file.secure_url)
//         : buildLocalUrl('', req.file.filename, 'images');
//     }
//     const member = await BoardMember.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
//     if (!member) return res.status(404).json({ success: false, message: 'Member not found.' });
//     res.json({ success: true, member });
//   } catch (err) { res.status(500).json({ success: false, message: err.message }); }
// });

// // DELETE /api/board-members/:id
// router.delete('/:id', protect, adminOnly, async (req, res) => {
//   try {
//     await BoardMember.findByIdAndDelete(req.params.id);
//     res.json({ success: true, message: 'Deleted.' });
//   } catch (err) { res.status(500).json({ success: false, message: err.message }); }
// });

// module.exports = router;

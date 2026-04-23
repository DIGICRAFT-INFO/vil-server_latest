require('dotenv').config();
const express   = require('express');
const mongoose  = require('mongoose');
const cors      = require('cors');
const helmet    = require('helmet');
const morgan    = require('morgan');
const path      = require('path');
const fs        = require('fs');

const app = express();
const PORT = process.env.PORT || 10000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// --- DATABASE CONNECTION ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected (VIL Production)'))
  .catch((err) => {
    console.error('❌ MongoDB Error:', err.message);
    process.exit(1);
  });

// --- CORS CONFIGURATION ---
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.ADMIN_URL,
  'https://vil-frontend-latest.vercel.app',
  'https://vil-admin-latest-onsq.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001'
];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin) || (origin && origin.endsWith('.vercel.app'))) {
      return cb(null, true);
    }
    cb(new Error(`CORS: ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// --- MIDDLEWARES ---
app.use(helmet({ 
  contentSecurityPolicy: false, 
  crossOriginResourcePolicy: { policy: "cross-origin" } 
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

if (NODE_ENV !== 'production') app.use(morgan('dev'));

// --- STATIC FILES & FOLDERS SETUP ---
// Crucial: This ensures '/uploads' in URL maps to the physical folder on disk
const uploadsPath = path.join(__dirname, 'public', 'uploads');
app.use('/uploads', express.static(uploadsPath));

// Ensure directories exist for local development fallback
const folders = [
  'public/uploads/documents',
  'public/uploads/images',
  'public/uploads/documents/financials_annual_reports' // Specific folder from your error
];

folders.forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

// --- ROUTES ---
app.use('/api/auth',            require('./routes/auth'));
app.use('/api/documents',       require('./routes/documents'));
app.use('/api/news',            require('./routes/news'));
app.use('/api/board-members',   require('./routes/boardMembers'));
app.use('/api/careers',         require('./routes/careers'));
app.use('/api/contacts',        require('./routes/contacts'));
app.use('/api/products',        require('./routes/products'));
app.use('/api/settings',        require('./routes/settings'));
app.use('/api/pages',           require('./routes/pageContent'));
app.use('/api/notifications',   require('./routes/notifications'));

// --- HEALTH & STATUS ---
app.get('/', (req, res) => res.send('Vaswani Industries Backend is Running...'));

app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    status: 'ok', 
    storage: process.env.STORAGE_MODE || 'local',
    cloudinary_configured: !!process.env.CLOUDINARY_CLOUD_NAME,
    environment: NODE_ENV 
  });
});

// --- GLOBAL ERROR HANDLER ---
app.use((err, req, res, next) => {
  const status = err.status || 500;
  console.error(`🔥 Error: ${err.message}`);
  res.status(status).json({
    success: false,
    message: NODE_ENV === 'production' ? 'Internal Server Error' : err.message
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port: ${PORT}`);
  console.log(`📦 Storage Mode: ${process.env.STORAGE_MODE || 'local'}`);
});

module.exports = app;

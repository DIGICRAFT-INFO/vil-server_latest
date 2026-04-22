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
  .then(() => console.log('✅ MongoDB Connected (Render Native)'))
  .catch((err) => {
    console.error('❌ MongoDB Error:', err.message);
    process.exit(1);
  });

// --- UPDATED CORS CONFIGURATION ---
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
    // 1. Allow requests with no origin (like mobile/curl)
    if (!origin) return cb(null, true);

    // 2. Allow if origin is in our list
    if (allowedOrigins.includes(origin)) return cb(null, true);

    // 3. SPECIAL FIX: Allow any Vercel preview/latest deployment from your account
    if (origin.endsWith('.vercel.app')) return cb(null, true);

    // Otherwise block
    console.warn(`⚠️ CORS Blocked for: ${origin}`);
    cb(new Error(`CORS: ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// --- MIDDLEWARES ---
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

if (NODE_ENV !== 'production') app.use(morgan('dev'));

// --- STATIC FILES ---
const uploadsPath = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}
app.use('/uploads', express.static(uploadsPath));

// --- ROUTES ---
app.use('/api/auth',           require('./routes/auth'));
app.use('/api/documents',      require('./routes/documents'));
app.use('/api/news',           require('./routes/news'));
app.use('/api/board-members',  require('./routes/boardMembers'));
app.use('/api/careers',        require('./routes/careers'));
app.use('/api/contacts',       require('./routes/contacts'));
app.use('/api/products',       require('./routes/products'));
app.use('/api/settings',       require('./routes/settings'));
app.use('/api/pages',          require('./routes/pageContent'));
app.use('/api/notifications',  require('./routes/notifications'));

app.get('/', (req, res) => res.send('Vaswani Industries Backend is Running...'));

app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'ok', environment: NODE_ENV, time: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: NODE_ENV === 'production' ? 'Internal Server Error' : err.message
  });
});

app.listen(PORT, () => console.log(`🚀 Server on port: ${PORT}`));

module.exports = app;

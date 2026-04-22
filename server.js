require('dotenv').config();
const express   = require('express');
const mongoose  = require('mongoose');
const cors      = require('cors');
const helmet    = require('helmet');
const morgan    = require('morgan');
const path      = require('path');
const fs        = require('fs');

const app = express();
const PORT = process.env.PORT || 10000; // Render use 10000 as default
const NODE_ENV = process.env.NODE_ENV || 'development';

// --- DATABASE CONNECTION (Standard Persistent Connection) ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected (Render Native)'))
  .catch((err) => {
    console.error('❌ MongoDB Error:', err.message);
    process.exit(1); // Stop server if DB fails
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
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin || allowedOrigins.includes(origin)) {
      cb(null, true);
    } else {
      cb(new Error(`CORS: ${origin} not allowed`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// --- MIDDLEWARES ---
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '50mb' })); // Increased for bulk data
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

if (NODE_ENV !== 'production') app.use(morgan('dev'));

// --- STATIC FILES (Read & Write enabled on Render) ---
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

// Root Route (To prevent 404 on '/')
app.get('/', (req, res) => {
  res.send('Vaswani Industries Backend is Running...');
});

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    status: 'ok', 
    environment: NODE_ENV,
    time: new Date().toISOString() 
  });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: NODE_ENV === 'production' ? 'Internal Server Error' : err.message
  });
});

// --- START SERVER ---
app.listen(PORT, () => {
  console.log(`🚀 Server is live on port: ${PORT}`);
  console.log(`🌍 Environment: ${NODE_ENV}`);
});

module.exports = app;







// require('dotenv').config();
// const express   = require('express');
// const mongoose  = require('mongoose');
// const cors      = require('cors');
// const helmet    = require('helmet');
// const morgan    = require('morgan');
// const rateLimit = require('express-rate-limit');
// const path      = require('path');
// const fs        = require('fs');

// // 1. Validate required environment variables
// const REQUIRED_ENV = ['MONGO_URI', 'JWT_SECRET'];
// REQUIRED_ENV.forEach(k => {
//   if (!process.env[k]) {
//     console.error(`❌ Missing critical environment variable: ${k}`);
//     process.exit(1);
//   }
// });

// const app          = express();
// const PORT         = parseInt(process.env.PORT || '5000', 10);
// const NODE_ENV     = process.env.NODE_ENV || 'development';

// // 2. Updated Allowed Origins (Including your new Vercel URL)
// const allowedOrigins = [
//   process.env.FRONTEND_URL, // From .env
//   process.env.ADMIN_URL,    // From .env
//   'https://vil-frontend-latest.vercel.app', 
//   'http://localhost:3000',
//   'http://localhost:3001',
//   'http://localhost:3002'
// ];

// // 3. Security & Middleware
// app.use(helmet({ 
//   contentSecurityPolicy: false, 
//   crossOriginResourcePolicy: { policy: 'cross-origin' }, 
//   crossOriginOpenerPolicy: false 
// }));

// app.use(cors({
//   origin: (origin, cb) => {
//     // Allow requests with no origin (like mobile apps, curl, or server-side calls)
//     if (!origin) return cb(null, true);
//     if (allowedOrigins.includes(origin)) {
//       cb(null, true);
//     } else {
//       console.warn(`⚠️ Blocked by CORS: ${origin}`);
//       cb(new Error(`CORS: ${origin} not allowed`));
//     }
//   },
//   credentials: true,
//   methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
//   allowedHeaders: ['Content-Type','Authorization'],
// }));

// app.use(express.json({ limit: '10mb' }));
// app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// if (NODE_ENV !== 'production') {
//   app.use(morgan('dev'));
// }

// // 4. File System Setup (Uploads)
// const uploadsPath = path.join(__dirname, 'public/uploads');
// if (!fs.existsSync(uploadsPath)) {
//   fs.mkdirSync(uploadsPath, { recursive: true });
// }

// // Static file serving with CORS fix for images/PDFs
// app.use('/uploads', express.static(uploadsPath, {
//   maxAge: NODE_ENV === 'production' ? '7d' : '0',
//   etag: true,
//   setHeaders(res, fp) {
//     res.setHeader('Access-Control-Allow-Origin', '*'); // Allow frontend to fetch images
//     if (fp.endsWith('.pdf')) {
//       res.setHeader('Content-Type', 'application/pdf');
//       res.setHeader('Content-Disposition', 'inline');
//     }
//   },
// }));

// // 5. Rate Limiting
// const createLimiter = (max) => rateLimit({
//   windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MINUTES || '15') * 60000,
//   max: max,
//   standardHeaders: true,
//   legacyHeaders: false,
//   message: { success: false, message: "Too many requests, please try again later." }
// });

// app.use('/api/auth/login', createLimiter(parseInt(process.env.LOGIN_RATE_LIMIT_MAX || '10')));
// app.use('/api/', createLimiter(parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '500')));

// // 6. API Routes
// app.use('/api/auth',          require('./routes/auth'));
// app.use('/api/documents',     require('./routes/documents'));
// app.use('/api/news',          require('./routes/news'));
// app.use('/api/board-members', require('./routes/boardMembers'));
// app.use('/api/careers',       require('./routes/careers'));
// app.use('/api/contacts',      require('./routes/contacts'));
// app.use('/api/products',      require('./routes/products'));
// app.use('/api/settings',      require('./routes/settings'));
// app.use('/api/pages',         require('./routes/pageContent'));
// app.use('/api/notifications', require('./routes/notifications'));

// // 7. Health Check & Utilities
// app.get('/api/health', (_req, res) => res.json({ 
//   success: true, 
//   status: 'ok', 
//   env: NODE_ENV, 
//   storage: process.env.STORAGE_MODE || 'local', 
//   time: new Date().toISOString() 
// }));

// app.get('/favicon.ico', (req, res) => res.status(204).end());

// // 8. Error Handling
// app.use('/api/*', (_req, res) => res.status(404).json({ success: false, message: 'API route not found.' }));

// app.use((err, _req, res, _next) => {
//   const status = err.status || 500;
//   console.error(`[ERROR ${status}]`, err.message);
  
//   if (err.name === 'ValidationError') {
//     return res.status(400).json({ success: false, message: Object.values(err.errors).map(e => e.message).join(', ') });
//   }
//   if (err.code === 11000) {
//     return res.status(400).json({ success: false, message: 'Duplicate entry detected.' });
//   }
  
//   res.status(status).json({ 
//     success: false, 
//     message: NODE_ENV === 'production' ? 'Internal server error' : err.message 
//   });
// });

// // 9. Database Connection & Server Start
// mongoose.set('strictQuery', false); // Prepare for Mongoose 7/8
// mongoose.connect(process.env.MONGO_URI)
//   .then(() => {
//     console.log('✅ MongoDB Connected Successfully');
//     app.listen(PORT, () => {
//       console.log(`\n🚀 API Running  → http://localhost:${PORT}/api/health`);
//       console.log(`📂 Uploads Link → http://localhost:${PORT}/uploads`);
//       console.log(`🌐 Production  → ${FRONTEND_URL}\n`);
//     });
//   })
//   .catch(err => { 
//     console.error('❌ MongoDB Connection Error:', err.message); 
//     process.exit(1); 
//   });


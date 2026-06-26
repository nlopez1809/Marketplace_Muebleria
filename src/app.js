const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const path = require('path');

const { requireAuth, login, logout, checkSession } = require('./middleware/auth');
const { sanitizeBody } = require('./middleware/sanitize');
const chatRoutes = require('./routes/chat');
const productsRoutes = require('./routes/products');
const uploadRoutes = require('./routes/upload');
const leadRoutes = require('./routes/leads');
const asesoresRoutes = require('./routes/asesores');

const app = express();

// ── Security headers ──
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// ── CORS ──
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : undefined;

app.use(cors({
  origin: allowedOrigins || true,
  credentials: true,
}));

// ── Rate limiting ──
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Demasiadas solicitudes. Intenta en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const chatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 20,
  message: { error: 'Demasiados mensajes. Espera un momento.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Demasiados intentos de login. Espera 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Body parsing + sanitization ──
app.use(express.json({ limit: '10mb' }));
app.use(sanitizeBody);

// ── Sessions ──
app.use(session({
  secret: process.env.SESSION_SECRET || 'incassa-deco-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 4 * 60 * 60 * 1000,
    sameSite: 'lax',
  },
}));

// ── Static files ──
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ── Auth routes ──
app.post('/api/auth/login', loginLimiter, login);
app.post('/api/auth/logout', logout);
app.get('/api/auth/check', checkSession);

// ── Public API ──
app.use('/api/chat', chatLimiter, chatRoutes);
app.use('/api/products', apiLimiter, productsRoutes);
app.use('/api/asesor', apiLimiter, asesoresRoutes);

// ── Admin API (protected) ──
app.use('/api/admin/products', requireAuth, productsRoutes);
app.use('/api/admin/products', requireAuth, uploadRoutes);
app.use('/api/admin/leads', requireAuth, leadRoutes);
app.use('/api/admin/asesores', requireAuth, asesoresRoutes);

// ── Admin page (protected) ──
app.get('/admin.html', (req, res, next) => {
  if (req.session && req.session.admin) return next();
  res.redirect('/login.html');
});

app.get('/', (req, res) => {
  res.redirect('/muebleBo.dc.html');
});

module.exports = app;

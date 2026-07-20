const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path = require('path');

const { requireAuth, login, logout, checkSession } = require('./middleware/auth');
const { sanitizeBody } = require('./middleware/sanitize');
const chatRoutes = require('./routes/chat');
const productsRoutes = require('./routes/products');
const uploadRoutes = require('./routes/upload');
const leadRoutes = require('./routes/leads');
const asesoresRoutes = require('./routes/asesores');
const visualizeRoutes = require('./routes/visualize');
const storage = require('./services/storage');

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
app.use(express.json({ limit: '20mb' }));
app.use((req, res, next) => {
  if (req.path === '/api/auth/login') return next();
  sanitizeBody(req, res, next);
});

// ── Cookie parsing ──
app.use(cookieParser());

// ── Static files (assets/uploads only, NOT html directly) ──
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
// Serve static assets (css, js, images) but block direct .html access
app.use(express.static(path.join(__dirname, '..', 'public'), { index: false, extensions: [] }));

// ── Block direct .html file access ──
app.get('*.html', (req, res) => {
  res.status(404).send('Not found');
});

// ── Auth routes ──
app.post('/api/auth/login', loginLimiter, login);
app.post('/api/auth/logout', logout);
app.get('/api/auth/check', checkSession);

// ── Public API ──
app.use('/api/chat', chatLimiter, chatRoutes);
app.use('/api/products', apiLimiter, productsRoutes);
app.use('/api/asesor', apiLimiter, asesoresRoutes);
app.use('/api/visualize', visualizeRoutes);

// ── Admin API (protected) ──
app.get('/api/admin/dashboard', requireAuth, async (req, res) => {
  try { res.json(await storage.getDashboard()); }
  catch (e) { res.status(500).json({ error: 'Error al obtener dashboard' }); }
});

app.get('/api/admin/leads/export', requireAuth, async (req, res) => {
  try {
    const leads = await storage.getLeads();
    const rows = [['ID','Nombre','Teléfono','CI','Fecha']];
    leads.forEach(l => {
      const date = new Date(l.created_at).toLocaleString('es-BO');
      rows.push([l.id, l.nombre || '', l.telefono || '', l.ci || '', date]);
    });
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="leads.csv"');
    res.send('﻿' + csv);
  } catch (e) { res.status(500).json({ error: 'Error al exportar' }); }
});

app.use('/api/admin/products', requireAuth, productsRoutes);
app.use('/api/admin/products', requireAuth, uploadRoutes);
app.use('/api/admin/leads', requireAuth, leadRoutes);
app.use('/api/admin/asesores', requireAuth, asesoresRoutes);

// ── Clean URL routes ──
app.get('/admin', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'login.html'));
});

app.get('/producto/:id', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'Producto_Aurora.dc.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'muebleBo.dc.html'));
});

module.exports = app;

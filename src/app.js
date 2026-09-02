const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
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
const asesoramientoRoutes = require('./routes/asesoramiento');
const proformasRoutes = require('./routes/proformas');
const storage = require('./services/storage');
const supabase = require('./services/supabase');

// notifyNewLead is a no-op — notifications now use client polling instead of SSE
function notifyNewLead() {}
module.exports.notifyNewLead = notifyNewLead;

const app = express();
app.set('trust proxy', 1);

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


// ── Body parsing + sanitization ──
app.use(express.json({ limit: '20mb' }));
app.use((req, res, next) => {
  if (req.path === '/api/auth/login') return next();
  sanitizeBody(req, res, next);
});

// ── Cookie parsing ──
app.use(cookieParser());

// ── Block direct .html file access (must be before static middleware) ──
app.get(/\.html$/, (req, res) => {
  res.status(404).send('Not found');
});

// ── Static files (assets/uploads only, NOT html directly) ──
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
app.use(express.static(path.join(__dirname, '..', 'public'), { index: false, extensions: [] }));

// ── Auth routes ──
app.post('/api/auth/login', login);
app.post('/api/auth/logout', logout);
app.get('/api/auth/check', checkSession);

// ── Diagnóstico (temporal) ──
app.get('/api/diag', requireAuth, (req, res) => {
  res.json({
    groq: !!process.env.GROQ_API_KEY,
    supabase: !!process.env.SUPABASE_URL,
    node: process.version,
  });
});

// ── Public API ──
app.use('/api/chat', chatRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/asesor', asesoresRoutes);
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
app.use('/api/admin/asesoramiento', requireAuth, asesoramientoRoutes);
app.use('/api/admin/proformas', requireAuth, proformasRoutes);

// ── Store images public endpoint ──
app.get('/api/store-images', async (req, res) => {
  try {
    const { data: files } = await supabase.storage.from('store-assets').list('');
    if (!files || !files.length) return res.json({});
    const images = {};
    const ts = Date.now();
    files.forEach(f => {
      const slot = f.name.replace(/\.[^.]+$/, '');
      const { data } = supabase.storage.from('store-assets').getPublicUrl(f.name);
      images[slot] = data.publicUrl + '?t=' + ts;
    });
    res.json(images);
  } catch(e) { res.json({}); }
});

// ── Store images upload (Supabase Storage) ──
const multer = require('multer');
const storeUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

app.post('/api/admin/store-images/:slot', requireAuth, storeUpload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió archivo' });
  const allowed = ['hero-showroom', 'cat-melamina', 'cat-comedor', 'cat-camas', 'cat-sofas', 'Logo'];
  const slot = req.params.slot;
  if (!allowed.includes(slot)) return res.status(400).json({ error: 'Slot inválido' });
  try {
    const ext = req.file.originalname.split('.').pop().toLowerCase() || 'png';
    const filename = slot + '.' + ext;
    // Delete any existing files for this slot (different extension)
    const { data: existing } = await supabase.storage.from('store-assets').list('');
    if (existing) {
      const toDelete = existing.filter(f => f.name.replace(/\.[^.]+$/, '') === slot && f.name !== filename).map(f => f.name);
      if (toDelete.length) await supabase.storage.from('store-assets').remove(toDelete);
    }
    const { error: upErr } = await supabase.storage
      .from('store-assets')
      .upload(filename, req.file.buffer, { contentType: req.file.mimetype, upsert: true });
    if (upErr) throw upErr;
    const { data } = supabase.storage.from('store-assets').getPublicUrl(filename);
    res.json({ ok: true, url: data.publicUrl + '?t=' + Date.now() });
  } catch (e) {
    console.error('store-images upload error:', e);
    res.status(500).json({ error: 'Error al subir imagen: ' + e.message });
  }
});

// ── Poll endpoint for new leads (replaces SSE to avoid long-running serverless functions) ──
app.get('/api/admin/events/poll', requireAuth, async (req, res) => {
  try {
    const since = req.query.since ? new Date(req.query.since).toISOString() : new Date(Date.now() - 60000).toISOString();
    const { data } = await supabase.from('leads').select('*').gt('created_at', since).order('created_at', { ascending: false });
    res.json({ leads: data || [], ts: new Date().toISOString() });
  } catch(e) { res.json({ leads: [], ts: new Date().toISOString() }); }
});

// ── Analytics ──
app.get('/api/admin/analytics', requireAuth, async (req, res) => {
  try {
    const { data: leads } = await supabase.from('leads').select('*').order('created_at', { ascending: true });
    const all = leads || [];
    // Leads por día (últimos 30 días)
    const now = new Date();
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({ date: key, count: 0 });
    }
    all.forEach(l => {
      const key = l.created_at ? l.created_at.slice(0, 10) : null;
      const day = days.find(d => d.date === key);
      if (day) day.count++;
    });
    // Pipeline breakdown
    const stages = { nuevo: 0, contactado: 0, visita_agendada: 0, cerrado: 0, perdido: 0 };
    all.forEach(l => { const s = l.pipeline_stage || 'nuevo'; if (stages[s] !== undefined) stages[s]++; else stages.nuevo++; });
    // Productos más consultados
    const prodCount = {};
    all.forEach(l => {
      if (l.producto_interes) {
        l.producto_interes.split(',').forEach(p => {
          const name = p.trim().split(' Bs ')[0].trim();
          if (name) prodCount[name] = (prodCount[name] || 0) + 1;
        });
      }
    });
    const topProducts = Object.entries(prodCount).sort((a,b) => b[1]-a[1]).slice(0,5).map(([name,count]) => ({name,count}));
    // Conversión
    const totalLeads = all.length;
    const withVisit = all.filter(l => l.fecha_visita).length;
    const withPhone = all.filter(l => l.telefono).length;
    res.json({ days, stages, topProducts, totalLeads, withVisit, withPhone });
  } catch(e) { res.status(500).json({ error: 'Error al obtener analytics' }); }
});

// ── Visitas (calendario) ──
app.get('/api/admin/visitas', requireAuth, async (req, res) => {
  try {
    const { data } = await supabase.from('leads').select('id,nombre,telefono,producto_interes,fecha_visita,pipeline_stage').not('fecha_visita', 'is', null).order('fecha_visita');
    res.json(data || []);
  } catch(e) { res.status(500).json({ error: 'Error al obtener visitas' }); }
});

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

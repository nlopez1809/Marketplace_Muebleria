const express = require('express');
const router = express.Router();
const multer = require('multer');
const supabase = require('../services/supabase');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const STAGES = ['visita', 'revision_visita', 'diseno', 'revision_diseno', 'dibujo', 'revision_dibujo', 'completado'];
const STAGE_FOTO_MAP = { visita: 'fotos_visita', diseno: 'fotos_diseno', dibujo: 'fotos_dibujo' };

// GET /api/admin/asesoramiento/:leadId
router.get('/:leadId', async (req, res) => {
  try {
    const { data, error } = await supabase.from('asesoramientos').select('*').eq('lead_id', req.params.leadId).single();
    if (error && error.code !== 'PGRST116') throw error;
    res.json(data || null);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/admin/asesoramiento — create
router.post('/', async (req, res) => {
  try {
    const { lead_id, fecha_visita } = req.body;
    if (!lead_id) return res.status(400).json({ error: 'lead_id requerido' });
    const { data, error } = await supabase.from('asesoramientos').insert({
      lead_id, fecha_visita: fecha_visita || null, stage: 'visita'
    }).select().single();
    if (error) throw error;
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/admin/asesoramiento/:id/fecha
router.put('/:id/fecha', async (req, res) => {
  try {
    const { fecha_visita } = req.body;
    const { data, error } = await supabase.from('asesoramientos')
      .update({ fecha_visita, updated_at: new Date().toISOString() })
      .eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/admin/asesoramiento/:id/fotos — upload photos for current stage
router.post('/:id/fotos', upload.array('fotos', 20), async (req, res) => {
  try {
    const { data: ases, error: fetchErr } = await supabase.from('asesoramientos').select('*').eq('id', req.params.id).single();
    if (fetchErr) throw fetchErr;

    const fotoField = STAGE_FOTO_MAP[ases.stage];
    if (!fotoField) return res.status(400).json({ error: 'No se pueden subir fotos en esta etapa' });

    const urls = [];
    for (const file of req.files) {
      const ext = file.originalname.split('.').pop().toLowerCase() || 'jpg';
      const filename = `${req.params.id}/${ases.stage}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from('asesoramiento-files').upload(filename, file.buffer, { contentType: file.mimetype, upsert: false });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('asesoramiento-files').getPublicUrl(filename);
      urls.push(urlData.publicUrl);
    }

    const existing = ases[fotoField] || [];
    const updated = [...existing, ...urls];
    const { data, error } = await supabase.from('asesoramientos').update({ [fotoField]: updated, updated_at: new Date().toISOString() }).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/admin/asesoramiento/:id/aprobar — gerente approves current revision stage
router.post('/:id/aprobar', async (req, res) => {
  try {
    const { data: ases, error: fetchErr } = await supabase.from('asesoramientos').select('stage').eq('id', req.params.id).single();
    if (fetchErr) throw fetchErr;
    const idx = STAGES.indexOf(ases.stage);
    if (idx < 0 || idx >= STAGES.length - 1) return res.status(400).json({ error: 'No se puede avanzar desde esta etapa' });
    const nextStage = STAGES[idx + 1];
    const { data, error } = await supabase.from('asesoramientos').update({ stage: nextStage, notas_gerencia: req.body.notas || null, updated_at: new Date().toISOString() }).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/admin/asesoramiento/:id/rechazar — gerente rejects, goes back one stage
router.post('/:id/rechazar', async (req, res) => {
  try {
    const { data: ases, error: fetchErr } = await supabase.from('asesoramientos').select('stage').eq('id', req.params.id).single();
    if (fetchErr) throw fetchErr;
    const idx = STAGES.indexOf(ases.stage);
    if (idx <= 0) return res.status(400).json({ error: 'No se puede retroceder desde esta etapa' });
    const prevStage = STAGES[idx - 1];
    const { data, error } = await supabase.from('asesoramientos').update({ stage: prevStage, notas_gerencia: req.body.notas || null, updated_at: new Date().toISOString() }).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

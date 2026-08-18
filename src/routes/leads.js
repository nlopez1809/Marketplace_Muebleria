const express = require('express');
const router = express.Router();
const storage = require('../services/storage');
const supabase = require('../services/supabase');

router.get('/', async (req, res) => {
  try {
    const leads = await storage.getLeads();
    res.json(leads);
  } catch (e) {
    res.status(500).json({ error: 'Error al obtener leads' });
  }
});

// Create lead manually
router.post('/', async (req, res) => {
  try {
    const { nombre, telefono, ci, producto_interes, notas, pipeline_stage } = req.body;
    const newLead = await storage.createLead({
      nombre: nombre || '',
      telefono: telefono || '',
      ci: ci || '',
      producto_interes: producto_interes || '',
      notas: notas || '',
      pipeline_stage: pipeline_stage || 'nuevo',
      session_id: 'manual-' + Date.now(),
    });
    res.json(newLead);
  } catch (e) {
    res.status(500).json({ error: 'Error al crear lead' });
  }
});

// Update lead pipeline stage or any field
router.patch('/:id', async (req, res) => {
  try {
    const allowed = ['pipeline_stage', 'notas', 'nombre', 'telefono', 'ci', 'producto_interes', 'fecha_visita'];
    const updates = { updated_at: new Date().toISOString() };
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    const { data, error } = await supabase.from('leads').update(updates).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'Error al actualizar lead' });
  }
});

// Get conversation history for a lead
router.get('/:id/conversacion', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('conversacion, nombre, telefono, producto_interes')
      .eq('id', req.params.id)
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'Error al obtener conversación' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await storage.deleteLead(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Error al eliminar lead' });
  }
});

module.exports = router;

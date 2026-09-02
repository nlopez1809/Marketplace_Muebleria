const express = require('express');
const router = express.Router();
const supabase = require('../services/supabase');

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('proformas')
      .select('*')
      .order('numero', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'Error al obtener proformas' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { lead_id, cliente_nombre, cliente_telefono, cliente_ci, items, descuento_global, notas, validez_dias } = req.body;
    const { data, error } = await supabase
      .from('proformas')
      .insert({
        lead_id: lead_id || null,
        cliente_nombre: cliente_nombre || '',
        cliente_telefono: cliente_telefono || '',
        cliente_ci: cliente_ci || '',
        items: items || [],
        descuento_global: Number(descuento_global) || 0,
        notas: notas || '',
        validez_dias: Number(validez_dias) || 7,
        estado: 'borrador',
      })
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'Error al crear proforma' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const allowed = ['cliente_nombre','cliente_telefono','cliente_ci','items','descuento_global','notas','validez_dias','estado'];
    const updates = { updated_at: new Date().toISOString() };
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    const { data, error } = await supabase
      .from('proformas')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'Error al actualizar proforma' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('proformas').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Error al eliminar proforma' });
  }
});

module.exports = router;

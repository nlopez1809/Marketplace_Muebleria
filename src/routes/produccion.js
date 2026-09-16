const express = require('express');
const router = express.Router();
const supabase = require('../services/supabase');
const { requireRole } = require('../middleware/auth');

const PROD_STAGES = ['ingreso', 'revision', 'taller', 'produccion'];
const ETAPAS_PRODUCCION = ['En Producción', 'Barnizado', 'Terminado', 'Tapizado', 'Entregado'];

// GET / — list all with lead info
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase.from('produccion').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    const leadIds = [...new Set((data || []).map(p => p.lead_id).filter(Boolean))];
    let leadMap = {};
    if (leadIds.length) {
      const { data: leads } = await supabase.from('leads').select('id, nombre, telefono').in('id', leadIds);
      (leads || []).forEach(l => { leadMap[l.id] = l; });
    }
    res.json((data || []).map(p => ({ ...p, lead: leadMap[p.lead_id] || null })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /:id
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('produccion').select('*').eq('id', req.params.id).single();
    if (error) throw error;
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST / — crear desde asesoramiento completado
router.post('/', async (req, res) => {
  try {
    const { asesoramiento_id } = req.body;
    if (!asesoramiento_id) return res.status(400).json({ error: 'asesoramiento_id requerido' });

    // Verificar que el asesoramiento existe y está completado
    const { data: ases, error: aErr } = await supabase.from('asesoramientos').select('*').eq('id', asesoramiento_id).single();
    if (aErr) throw aErr;
    if (ases.stage !== 'completado') return res.status(400).json({ error: 'El asesoramiento debe estar en etapa completado' });

    // Verificar que no existe ya un registro de producción
    const { data: existing } = await supabase.from('produccion').select('id').eq('asesoramiento_id', asesoramiento_id).single();
    if (existing) return res.status(400).json({ error: 'Ya existe un registro de producción para este asesoramiento' });

    // Obtener nombre del cliente para código
    let leadNombre = '';
    if (ases.lead_id) {
      const { data: lead } = await supabase.from('leads').select('nombre').eq('id', ases.lead_id).single();
      leadNombre = lead?.nombre || '';
    }
    const codigo = `PROD-${leadNombre.substring(0,4).toUpperCase().replace(/\s/g,'')}-${Date.now().toString().slice(-6)}`;

    // Combinar todas las fotos aprobadas del asesoramiento
    const fotos = [
      ...(ases.fotos_visita || []),
      ...(ases.fotos_diseno || []),
      ...(ases.fotos_dibujo || []),
    ];

    const { data, error } = await supabase.from('produccion').insert({
      asesoramiento_id,
      lead_id: ases.lead_id,
      codigo_cliente: codigo,
      stage: 'ingreso',
      fotos,
      fecha_recepcion: new Date().toISOString(),
    }).select().single();
    if (error) throw error;
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /:id/avanzar — avanzar de ingreso→revision o taller→produccion (cualquier autenticado)
router.post('/:id/avanzar', async (req, res) => {
  try {
    const { data: prod, error: fetchErr } = await supabase.from('produccion').select('stage').eq('id', req.params.id).single();
    if (fetchErr) throw fetchErr;
    const idx = PROD_STAGES.indexOf(prod.stage);
    if (idx < 0 || idx >= PROD_STAGES.length - 1) return res.status(400).json({ error: 'No se puede avanzar desde esta etapa' });
    // revision y su aprobación son exclusivas del gerente — se bloquean aquí
    if (prod.stage === 'revision') return res.status(403).json({ error: 'La etapa de revisión solo puede ser aprobada por el gerente' });
    const nextStage = PROD_STAGES[idx + 1];
    const { data, error } = await supabase.from('produccion')
      .update({ stage: nextStage, updated_at: new Date().toISOString() })
      .eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /:id/aprobar — solo gerente: revision→taller
router.post('/:id/aprobar', requireRole('gerente'), async (req, res) => {
  try {
    const { data: prod, error: fetchErr } = await supabase.from('produccion').select('stage').eq('id', req.params.id).single();
    if (fetchErr) throw fetchErr;
    if (prod.stage !== 'revision') return res.status(400).json({ error: 'Solo se puede aprobar desde la etapa de revisión' });
    const { data, error } = await supabase.from('produccion')
      .update({ stage: 'taller', notas_revision: req.body.notas || null, updated_at: new Date().toISOString() })
      .eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /:id/rechazar — solo gerente: revision→ingreso, limpia notas_revision
router.post('/:id/rechazar', requireRole('gerente'), async (req, res) => {
  try {
    const { data: prod, error: fetchErr } = await supabase.from('produccion').select('stage').eq('id', req.params.id).single();
    if (fetchErr) throw fetchErr;
    if (prod.stage !== 'revision') return res.status(400).json({ error: 'Solo se puede rechazar desde la etapa de revisión' });
    const { data, error } = await supabase.from('produccion')
      .update({ stage: 'ingreso', notas_revision: req.body.notas || null, updated_at: new Date().toISOString() })
      .eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /:id — actualizar campos editables según rol
router.patch('/:id', async (req, res) => {
  try {
    const allowed = ['notas', 'notas_taller', 'etapa_produccion', 'fecha_cierre'];
    const gerenteOnly = ['fecha_entrega'];
    const almacenRoles = ['gerente', 'asesor']; // almacén puede editar fecha_estimada_cierre

    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (req.body.fecha_estimada_cierre !== undefined && almacenRoles.includes(req.admin?.role)) {
      updates.fecha_estimada_cierre = req.body.fecha_estimada_cierre;
    }
    if (req.body.fecha_entrega !== undefined) {
      if (req.admin?.role !== 'gerente') return res.status(403).json({ error: 'Solo el gerente puede configurar la fecha de entrega' });
      updates.fecha_entrega = req.body.fecha_entrega;
    }
    if (!Object.keys(updates).length) return res.status(400).json({ error: 'Sin campos para actualizar' });
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase.from('produccion').update(updates).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

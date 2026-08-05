const express = require('express');
const router = express.Router();
const storage = require('../services/storage');

router.get('/', async (req, res) => {
  try {
    const asesores = await storage.getAsesores();
    res.json(asesores);
  } catch (e) {
    res.status(500).json({ error: 'Error al obtener asesores' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { nombre, telefono, horario_inicio, horario_fin, dias_activos } = req.body;
    if (!nombre || !telefono) return res.status(400).json({ error: 'nombre y telefono son requeridos' });
    const asesor = await storage.createAsesor({
      nombre, telefono,
      horario_inicio: horario_inicio || '08:00',
      horario_fin: horario_fin || '18:00',
      dias_activos: dias_activos || [1,2,3,4,5],
    });
    res.json(asesor);
  } catch (e) {
    res.status(500).json({ error: 'Error al crear asesor' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { nombre, telefono, horario_inicio, horario_fin, dias_activos } = req.body;
    const updates = {};
    if (nombre) updates.nombre = nombre;
    if (telefono) updates.telefono = telefono;
    if (horario_inicio !== undefined) updates.horario_inicio = horario_inicio;
    if (horario_fin !== undefined) updates.horario_fin = horario_fin;
    if (dias_activos !== undefined) updates.dias_activos = dias_activos;
    const asesor = await storage.updateAsesor(parseInt(req.params.id), updates);
    res.json(asesor);
  } catch (e) {
    res.status(500).json({ error: 'Error al actualizar asesor' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await storage.deleteAsesor(parseInt(req.params.id));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Error al eliminar asesor' });
  }
});

module.exports = router;

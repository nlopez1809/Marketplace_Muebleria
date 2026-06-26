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
    const { nombre, telefono } = req.body;
    if (!nombre || !telefono) return res.status(400).json({ error: 'nombre y telefono son requeridos' });
    const asesor = await storage.createAsesor({ nombre, telefono });
    res.json(asesor);
  } catch (e) {
    res.status(500).json({ error: 'Error al crear asesor' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { nombre, telefono } = req.body;
    const updates = {};
    if (nombre) updates.nombre = nombre;
    if (telefono) updates.telefono = telefono;
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

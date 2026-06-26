const express = require('express');
const router = express.Router();
const storage = require('../services/storage');

router.get('/', (req, res) => {
  const data = storage.load();
  res.json(data.asesores);
});

router.post('/', (req, res) => {
  const data = storage.load();
  const { nombre, telefono } = req.body;
  if (!nombre || !telefono) return res.status(400).json({ error: 'nombre y telefono son requeridos' });

  const id = (data.asesores.length ? Math.max(...data.asesores.map(a => a.id)) : 0) + 1;
  const asesor = { id, nombre, telefono };
  data.asesores.push(asesor);
  storage.save(data);
  res.json(asesor);
});

router.put('/:id', (req, res) => {
  const data = storage.load();
  const idx = data.asesores.findIndex(a => a.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Asesor no encontrado' });

  const { nombre, telefono } = req.body;
  if (nombre) data.asesores[idx].nombre = nombre;
  if (telefono) data.asesores[idx].telefono = telefono;
  storage.save(data);
  res.json(data.asesores[idx]);
});

router.delete('/:id', (req, res) => {
  const data = storage.load();
  const idx = data.asesores.findIndex(a => a.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Asesor no encontrado' });

  data.asesores.splice(idx, 1);
  storage.save(data);
  res.json({ ok: true });
});

module.exports = router;

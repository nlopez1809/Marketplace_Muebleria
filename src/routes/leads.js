const express = require('express');
const router = express.Router();
const storage = require('../services/storage');

router.get('/', (req, res) => {
  const data = storage.load();
  res.json(data.leads || []);
});

router.delete('/:id', (req, res) => {
  const data = storage.load();
  const idx = (data.leads || []).findIndex(l => l.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Lead no encontrado' });
  data.leads.splice(idx, 1);
  storage.save(data);
  res.json({ ok: true });
});

module.exports = router;

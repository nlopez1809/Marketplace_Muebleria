const express = require('express');
const router = express.Router();
const storage = require('../services/storage');

router.get('/', async (req, res) => {
  try {
    const leads = await storage.getLeads();
    res.json(leads);
  } catch (e) {
    res.status(500).json({ error: 'Error al obtener leads' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await storage.deleteLead(parseInt(req.params.id));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Error al eliminar lead' });
  }
});

module.exports = router;

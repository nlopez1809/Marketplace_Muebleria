const express = require('express');
const router = express.Router();
const storage = require('../services/storage');

router.get('/', async (req, res) => {
  try {
    const products = await storage.getProducts();
    res.json(products);
  } catch (e) {
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

router.post('/', async (req, res) => {
  try {
    const p = req.body;
    if (!p.id || !p.name) return res.status(400).json({ error: 'id y name son requeridos' });

    const product = {
      id: p.id,
      name: p.name,
      cat: p.cat || '',
      type: p.type || 'sofa',
      price: Number(p.price) || 0,
      old: p.old ? Number(p.old) : null,
      badge: p.badge || null,
      material: p.material || '',
      city: p.city || '',
      rating: Number(p.rating) || 4.5,
      reviews: Number(p.reviews) || 0,
      tones: p.tones || ['#7E5BC4', '#D8BE8C'],
      city2: p.city2 || '2-4 días',
      dims: p.dims || '',
      weight: p.weight || '',
      warranty: p.warranty || '2 años',
      desc: p.desc || '',
      images: p.images || [],
    };

    const created = await storage.createProduct(product);
    res.json(created);
  } catch (e) {
    if (e.code === '23505') return res.status(400).json({ error: 'ID ya existe' });
    res.status(500).json({ error: 'Error al crear producto' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const p = req.body;
    const updates = {};
    for (const key of ['name','cat','type','material','city','city2','dims','weight','warranty','desc','tones','images','badge']) {
      if (p[key] !== undefined) updates[key] = p[key];
    }
    for (const key of ['price','old','rating','reviews']) {
      if (p[key] !== undefined) updates[key] = p[key] === null || p[key] === '' ? null : Number(p[key]);
    }

    const updated = await storage.updateProduct(req.params.id, updates);
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await storage.deleteProduct(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
});

module.exports = router;

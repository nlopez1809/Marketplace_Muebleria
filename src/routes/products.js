const express = require('express');
const router = express.Router();
const storage = require('../services/storage');

router.get('/', (req, res) => {
  const data = storage.load();
  res.json(data.products);
});

router.post('/', (req, res) => {
  const data = storage.load();
  const p = req.body;
  if (!p.id || !p.name) return res.status(400).json({ error: 'id y name son requeridos' });
  if (data.products.find(x => x.id === p.id)) return res.status(400).json({ error: 'ID ya existe' });

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
    images: p.images || []
  };

  data.products.push(product);
  storage.save(data);
  res.json(product);
});

router.put('/:id', (req, res) => {
  const data = storage.load();
  const idx = data.products.findIndex(x => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Producto no encontrado' });

  const p = req.body;
  const existing = data.products[idx];
  data.products[idx] = {
    ...existing,
    name: p.name ?? existing.name,
    cat: p.cat ?? existing.cat,
    type: p.type ?? existing.type,
    price: p.price !== undefined ? Number(p.price) : existing.price,
    old: p.old !== undefined ? (p.old ? Number(p.old) : null) : existing.old,
    badge: p.badge !== undefined ? (p.badge || null) : existing.badge,
    material: p.material ?? existing.material,
    city: p.city ?? existing.city,
    rating: p.rating !== undefined ? Number(p.rating) : existing.rating,
    reviews: p.reviews !== undefined ? Number(p.reviews) : existing.reviews,
    tones: p.tones ?? existing.tones,
    city2: p.city2 ?? existing.city2,
    dims: p.dims ?? existing.dims,
    weight: p.weight ?? existing.weight,
    warranty: p.warranty ?? existing.warranty,
    desc: p.desc ?? existing.desc,
    images: p.images ?? existing.images
  };

  storage.save(data);
  res.json(data.products[idx]);
});

router.delete('/:id', (req, res) => {
  const data = storage.load();
  const idx = data.products.findIndex(x => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Producto no encontrado' });

  data.products.splice(idx, 1);
  storage.save(data);
  res.json({ ok: true });
});

module.exports = router;

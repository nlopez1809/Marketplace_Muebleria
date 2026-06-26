const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const storage = require('../services/storage');

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(__dirname, '..', '..', 'uploads', 'productos');
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const name = Date.now() + '-' + Math.random().toString(36).slice(2, 8) + ext;
      cb(null, name);
    }
  }),
  limits: { fileSize: 50 * 1024 * 1024 }
});

router.post('/:id/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió archivo' });

  const data = storage.load();
  const idx = data.products.findIndex(x => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Producto no encontrado' });

  const filePath = req.file.path;
  const fileBuffer = fs.readFileSync(filePath);
  const ext = path.extname(req.file.originalname).toLowerCase();
  const mimeMap = {'.png':'image/png','.webp':'image/webp','.gif':'image/gif','.jpg':'image/jpeg','.jpeg':'image/jpeg','.mp4':'video/mp4','.webm':'video/webm','.mov':'video/quicktime'};
  const mime = mimeMap[ext] || 'application/octet-stream';
  const dataUrl = 'data:' + mime + ';base64,' + fileBuffer.toString('base64');

  data.products[idx].images.push(dataUrl);
  storage.save(data);

  try { fs.unlinkSync(filePath); } catch(e) {}

  res.json({ image: dataUrl, images: data.products[idx].images });
});

router.delete('/:id/images/:imgIdx', (req, res) => {
  const data = storage.load();
  const idx = data.products.findIndex(x => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Producto no encontrado' });

  const imgIdx = parseInt(req.params.imgIdx);
  if (imgIdx < 0 || imgIdx >= data.products[idx].images.length) {
    return res.status(400).json({ error: 'Índice de imagen inválido' });
  }

  const removed = data.products[idx].images.splice(imgIdx, 1)[0];
  storage.save(data);

  if (removed && !removed.startsWith('data:') && removed.startsWith('uploads/')) {
    const fullPath = path.join(__dirname, '..', '..', removed);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  }

  res.json({ ok: true, images: data.products[idx].images });
});

module.exports = router;

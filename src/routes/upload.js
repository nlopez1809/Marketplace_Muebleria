const express = require('express');
const router = express.Router();
const multer = require('multer');
const supabase = require('../services/supabase');
const storage = require('../services/storage');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

router.post('/:id/upload', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió archivo' });

  try {
    const product = await storage.getProduct(req.params.id);
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' });

    const ext = req.file.originalname.split('.').pop().toLowerCase();
    const fileName = `${req.params.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName);

    const images = [...(product.images || []), urlData.publicUrl];
    const updated = await storage.updateProduct(req.params.id, { images });

    res.json({ image: urlData.publicUrl, images: updated.images });
  } catch (e) {
    res.status(500).json({ error: 'Error al subir imagen' });
  }
});

router.delete('/:id/images/:imgIdx', async (req, res) => {
  try {
    const product = await storage.getProduct(req.params.id);
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' });

    const imgIdx = parseInt(req.params.imgIdx);
    if (imgIdx < 0 || imgIdx >= (product.images || []).length) {
      return res.status(400).json({ error: 'Índice de imagen inválido' });
    }

    const imageUrl = product.images[imgIdx];
    const match = imageUrl.match(/product-images\/(.+)$/);
    if (match) {
      await supabase.storage.from('product-images').remove([match[1]]);
    }

    const images = product.images.filter((_, i) => i !== imgIdx);
    await storage.updateProduct(req.params.id, { images });

    res.json({ ok: true, images });
  } catch (e) {
    res.status(500).json({ error: 'Error al eliminar imagen' });
  }
});

module.exports = router;

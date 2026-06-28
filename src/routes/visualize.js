const express = require('express');
const router = express.Router();

function getHfToken() {
  return process.env.HF_API_TOKEN || '';
}

router.post('/', async (req, res) => {
  try {
    const { roomImage, productName, productDescription } = req.body;

    if (!roomImage) {
      return res.status(400).json({ error: 'Se requiere imagen del ambiente' });
    }

    const token = getHfToken();
    if (!token) {
      return res.status(500).json({ error: 'API de visualización no configurada' });
    }

    var base64Data = roomImage.replace(/^data:image\/[^;]+;base64,/, '');
    var imageBuffer = Buffer.from(base64Data, 'base64');

    var prompt = 'Place a ' + (productName || 'furniture') + ' in this room. Match perspective and lighting. Photorealistic interior design photo.';

    var response = await fetch('https://api-inference.huggingface.co/models/timbrooks/instruct-pix2pix', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
      },
      body: imageBuffer,
    });

    var contentType = (response.headers.get('content-type') || '');

    if (!response.ok) {
      var errBody = '';
      try { errBody = await response.text(); } catch(e) { errBody = 'no body'; }
      console.error('HF error:', response.status, errBody);
      return res.status(502).json({ error: 'Error al generar visualización', detail: errBody });
    }

    if (contentType.includes('image')) {
      var buf = Buffer.from(await response.arrayBuffer());
      var b64 = buf.toString('base64');
      var ext = contentType.includes('jpeg') ? 'jpeg' : 'png';
      return res.json({ image: 'data:image/' + ext + ';base64,' + b64 });
    }

    var data = {};
    try { data = await response.json(); } catch(e) {}

    if (data.error) {
      console.error('HF API error:', data.error);
      return res.status(502).json({ error: 'Error al generar visualización', detail: data.error });
    }

    return res.status(502).json({ error: 'Respuesta inesperada de la IA', detail: contentType });
  } catch (err) {
    var msg = err ? (err.message || err.toString()) : 'unknown';
    console.error('Visualize catch:', msg, err ? err.stack : '');
    res.status(500).json({ error: 'Error interno al procesar la imagen', detail: msg });
  }
});

module.exports = router;

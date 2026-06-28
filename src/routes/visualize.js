const express = require('express');
const router = express.Router();

function getHfToken() {
  return process.env.HF_API_TOKEN || '';
}

router.get('/test', async (req, res) => {
  var token = getHfToken();
  if (!token) return res.json({ status: 'no token configured' });

  try {
    var r = await fetch('https://api-inference.huggingface.co/models/timbrooks/instruct-pix2pix', {
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + token },
    });
    var data = await r.json();
    res.json({ status: r.status, model: data });
  } catch (err) {
    res.json({ status: 'error', detail: err.message || String(err) });
  }
});

router.post('/', async (req, res) => {
  try {
    var roomImage = req.body.roomImage;
    var productName = req.body.productName;

    if (!roomImage) {
      return res.status(400).json({ error: 'Se requiere imagen del ambiente' });
    }

    var token = getHfToken();
    if (!token) {
      return res.status(500).json({ error: 'API de visualización no configurada' });
    }

    var base64Data = roomImage.replace(/^data:image\/[^;]+;base64,/, '');
    var imageBuffer = Buffer.from(base64Data, 'base64');

    console.log('Image buffer size:', imageBuffer.length, 'bytes');

    var response = await fetch('https://api-inference.huggingface.co/models/timbrooks/instruct-pix2pix', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/octet-stream',
      },
      body: imageBuffer,
    });

    console.log('HF status:', response.status, 'content-type:', response.headers.get('content-type'));

    var contentType = response.headers.get('content-type') || '';

    if (!response.ok) {
      var errText = await response.text();
      console.error('HF error:', response.status, errText);
      return res.status(502).json({ error: 'Error al generar visualización', detail: errText });
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
      return res.status(502).json({ error: 'Error al generar visualización', detail: data.error });
    }

    return res.status(502).json({ error: 'Respuesta inesperada', detail: contentType });
  } catch (err) {
    var msg = err ? (err.message || String(err)) : 'unknown';
    console.error('Visualize catch:', msg);
    res.status(500).json({ error: 'Error interno al procesar la imagen', detail: msg });
  }
});

module.exports = router;

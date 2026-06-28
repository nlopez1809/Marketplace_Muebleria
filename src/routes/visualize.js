const express = require('express');
const https = require('https');
const router = express.Router();

function getHfToken() {
  return process.env.HF_API_TOKEN || '';
}

function callHuggingFace(imageBuffer, token) {
  return new Promise(function(resolve, reject) {
    var options = {
      hostname: 'api-inference.huggingface.co',
      path: '/models/timbrooks/instruct-pix2pix',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Length': imageBuffer.length,
      },
      timeout: 55000,
    };

    var req = https.request(options, function(res) {
      var chunks = [];
      res.on('data', function(chunk) { chunks.push(chunk); });
      res.on('end', function() {
        var body = Buffer.concat(chunks);
        var ct = res.headers['content-type'] || '';
        resolve({ status: res.statusCode, contentType: ct, body: body });
      });
    });

    req.on('error', function(err) { reject(err); });
    req.on('timeout', function() { req.destroy(); reject(new Error('Request timeout')); });
    req.write(imageBuffer);
    req.end();
  });
}

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

    console.log('Sending to HF, buffer size:', imageBuffer.length, 'bytes');

    var result = await callHuggingFace(imageBuffer, token);

    console.log('HF response:', result.status, result.contentType, 'body size:', result.body.length);

    if (result.status !== 200) {
      var errText = result.body.toString('utf-8');
      console.error('HF error:', result.status, errText);
      return res.status(502).json({ error: 'Error al generar visualización', detail: errText });
    }

    if (result.contentType.includes('image')) {
      var b64 = result.body.toString('base64');
      var ext = result.contentType.includes('jpeg') ? 'jpeg' : 'png';
      return res.json({ image: 'data:image/' + ext + ';base64,' + b64 });
    }

    var data = {};
    try { data = JSON.parse(result.body.toString('utf-8')); } catch(e) {}

    if (data.error) {
      console.error('HF API error:', data.error);
      return res.status(502).json({ error: 'Error al generar visualización', detail: data.error });
    }

    return res.status(502).json({ error: 'Respuesta inesperada', detail: result.contentType });
  } catch (err) {
    var msg = err ? (err.message || String(err)) : 'unknown';
    console.error('Visualize catch:', msg);
    res.status(500).json({ error: 'Error interno al procesar la imagen', detail: msg });
  }
});

module.exports = router;

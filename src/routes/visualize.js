const express = require('express');
const { HfInference } = require('@huggingface/inference');
const router = express.Router();

function getHfToken() {
  return process.env.HF_API_TOKEN || '';
}

router.get('/test', async (req, res) => {
  var token = getHfToken();
  res.json({ hasToken: !!token, tokenLength: token.length });
});

router.post('/', async (req, res) => {
  try {
    var roomImage = req.body.roomImage;
    var productName = req.body.productName;
    var productDescription = req.body.productDescription || '';

    if (!roomImage) {
      return res.status(400).json({ error: 'Se requiere imagen del ambiente' });
    }

    var token = getHfToken();
    if (!token) {
      return res.status(500).json({ error: 'API de visualización no configurada' });
    }

    var base64Data = roomImage.replace(/^data:image\/[^;]+;base64,/, '');
    var imageBuffer = Buffer.from(base64Data, 'base64');
    var imageBlob = new Blob([imageBuffer], { type: 'image/jpeg' });

    console.log('Image size:', imageBuffer.length, 'bytes');

    var hf = new HfInference(token);

    var prompt = 'Place a ' + (productName || 'furniture') + ' in this room. Match perspective, lighting, and shadows. Photorealistic interior design, 8K quality.';

    var result = await hf.imageToImage({
      model: 'timbrooks/instruct-pix2pix',
      inputs: imageBlob,
      parameters: {
        prompt: prompt,
        guidance_scale: 7.5,
        image_guidance_scale: 1.5,
        num_inference_steps: 25,
      },
    });

    var arrayBuf = await result.arrayBuffer();
    var b64 = Buffer.from(arrayBuf).toString('base64');

    res.json({ image: 'data:image/jpeg;base64,' + b64 });
  } catch (err) {
    var msg = err ? (err.message || String(err)) : 'unknown';
    console.error('Visualize error:', msg);
    res.status(500).json({ error: 'Error al generar visualización', detail: msg });
  }
});

module.exports = router;

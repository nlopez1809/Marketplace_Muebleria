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

    const base64Data = roomImage.replace(/^data:image\/[^;]+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    const prompt = 'Place a ' + (productName || 'elegant furniture piece') + ' (' + (productDescription || 'premium quality furniture') + ') into this room, perfectly proportional to the space. Match perspective, lighting, and shadows. Add decorative details like cushions, a plant, and a soft rug. Photorealistic interior design photo, 8K quality.';

    const payload = JSON.stringify({
      inputs: {
        image: base64Data,
        prompt: prompt,
      },
      parameters: {
        image_guidance_scale: 1.5,
        guidance_scale: 7.5,
        num_inference_steps: 25,
      },
    });

    const response = await fetch('https://api-inference.huggingface.co/models/timbrooks/instruct-pix2pix', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
      },
      body: payload,
    });

    if (!response.ok) {
      let errorDetail;
      try { errorDetail = await response.text(); } catch (e) { errorDetail = 'status ' + response.status; }
      console.error('HuggingFace error:', response.status, errorDetail);
      return res.status(502).json({ error: 'Error al generar visualización', detail: errorDetail });
    }

    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('image')) {
      const buffer = await response.arrayBuffer();
      const resultBase64 = Buffer.from(buffer).toString('base64');
      const imgType = contentType.includes('jpeg') ? 'jpeg' : 'png';
      return res.json({ image: 'data:image/' + imgType + ';base64,' + resultBase64 });
    }

    let data;
    try { data = await response.json(); } catch (e) { data = {}; }

    if (data.error) {
      console.error('HuggingFace API error:', data.error);
      return res.status(502).json({ error: 'Error al generar visualización', detail: data.error });
    }

    res.json({ image: data });
  } catch (err) {
    console.error('Visualize error:', err && err.message ? err.message : String(err));
    res.status(500).json({ error: 'Error interno al procesar la imagen', detail: err && err.message ? err.message : 'Error desconocido' });
  }
});

module.exports = router;

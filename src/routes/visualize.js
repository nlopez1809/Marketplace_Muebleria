const express = require('express');
const router = express.Router();

function getSegmindKey() {
  return process.env.SEGMIND_API_KEY || '';
}

router.post('/', async (req, res) => {
  try {
    const { roomImage, productName, productDescription } = req.body;

    if (!roomImage) {
      return res.status(400).json({ error: 'Se requiere imagen del ambiente' });
    }

    const apiKey = getSegmindKey();
    if (!apiKey) {
      return res.status(500).json({ error: 'API de visualización no configurada' });
    }

    const base64Data = roomImage.replace(/^data:image\/\w+;base64,/, '');

    const prompt = `A realistic interior design photo showing a ${productName || 'elegant furniture piece'} placed naturally in this room. ${productDescription || 'Premium quality furniture'}. The furniture blends perfectly with the room's lighting, shadows, and perspective. Photorealistic, interior design magazine quality.`;

    const response = await fetch('https://api.segmind.com/v1/sd1.5-img2img', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: base64Data,
        prompt: prompt,
        negative_prompt: 'blurry, distorted, low quality, cartoon, drawing, painting, watermark, text, logo, unrealistic, floating furniture',
        samples: 1,
        scheduler: 'DDIM',
        num_inference_steps: 30,
        guidance_scale: 7.5,
        strength: 0.45,
        seed: -1,
        img_width: 768,
        img_height: 768,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Segmind error:', response.status, errorText);
      return res.status(502).json({ error: 'Error al generar visualización' });
    }

    const buffer = await response.arrayBuffer();
    const resultBase64 = Buffer.from(buffer).toString('base64');

    res.json({
      image: 'data:image/png;base64,' + resultBase64,
    });
  } catch (err) {
    console.error('Visualize error:', err.message);
    res.status(500).json({ error: 'Error interno al procesar la imagen' });
  }
});

module.exports = router;

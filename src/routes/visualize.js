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

    const prompt = `Ultra-realistic interior design photograph. Place a ${productName || 'elegant furniture piece'} (${productDescription || 'premium quality furniture'}) into this exact room, perfectly proportional to the real dimensions of the space. The furniture must match the room's perspective, vanishing points, lighting direction, shadow angles and color temperature. Add subtle decorative details that complement the existing style: a textured throw blanket, decorative cushions, a small plant or vase nearby, and a soft area rug if appropriate. Everything must look like a single real photograph taken by an interior design magazine photographer. 8K, photorealistic, natural lighting, no artifacts, no floating objects.`;

    const response = await fetch('https://api.segmind.com/v1/sd1.5-img2img', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: base64Data,
        prompt: prompt,
        negative_prompt: 'blurry, distorted, low quality, cartoon, drawing, painting, watermark, text, logo, unrealistic, floating furniture, disproportionate, oversized, undersized, wrong perspective, duplicate furniture, extra limbs, deformed, disfigured, bad anatomy, out of frame',
        samples: 1,
        scheduler: 'DDIM',
        num_inference_steps: 30,
        guidance_scale: 7.5,
        strength: 0.45,
        seed: -1,
        img_width: 768,
        img_height: 768,
        base64: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Segmind error:', response.status, errorText);
      return res.status(502).json({ error: 'Error al generar visualización', detail: errorText });
    }

    const data = await response.json();
    const resultBase64 = data.image || data.output || data.data;

    if (!resultBase64) {
      console.error('Segmind: no image in response', JSON.stringify(data).slice(0, 500));
      return res.status(502).json({ error: 'No se recibió imagen de la IA' });
    }

    res.json({
      image: 'data:image/png;base64,' + resultBase64,
    });
  } catch (err) {
    console.error('Visualize error:', err.message);
    res.status(500).json({ error: 'Error interno al procesar la imagen' });
  }
});

module.exports = router;

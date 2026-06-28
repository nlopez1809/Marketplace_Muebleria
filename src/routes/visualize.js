const express = require('express');
const router = express.Router();

function getReplicateToken() {
  return process.env.REPLICATE_API_TOKEN || '';
}

router.post('/', async (req, res) => {
  try {
    const { roomImage, productName, productDescription } = req.body;

    if (!roomImage) {
      return res.status(400).json({ error: 'Se requiere imagen del ambiente' });
    }

    const token = getReplicateToken();
    if (!token) {
      return res.status(500).json({ error: 'API de visualización no configurada' });
    }

    const prompt = `Ultra-realistic interior design photograph. Place a ${productName || 'elegant furniture piece'} (${productDescription || 'premium quality furniture'}) into this exact room, perfectly proportional to the real dimensions of the space. The furniture must match the room's perspective, vanishing points, lighting direction, shadow angles and color temperature. Add subtle decorative details that complement the existing style: a textured throw blanket, decorative cushions, a small plant or vase nearby, and a soft area rug if appropriate. Everything must look like a single real photograph taken by an interior design magazine photographer. 8K, photorealistic, natural lighting, no artifacts, no floating objects.`;

    const negativePrompt = 'blurry, distorted, low quality, cartoon, drawing, painting, watermark, text, logo, unrealistic, floating furniture, disproportionate, oversized, undersized, wrong perspective, duplicate furniture, deformed, disfigured, out of frame';

    const response = await fetch('https://api.replicate.com/v1/models/stability-ai/stable-diffusion-img2img/predictions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
        'Prefer': 'wait',
      },
      body: JSON.stringify({
        input: {
          image: roomImage,
          prompt: prompt,
          negative_prompt: negativePrompt,
          prompt_strength: 0.45,
          num_inference_steps: 30,
          guidance_scale: 7.5,
          scheduler: 'K_EULER',
        },
      }),
    });

    const data = await response.json();

    if (!response.ok || data.status === 'failed') {
      console.error('Replicate error:', response.status, JSON.stringify(data.error || data).slice(0, 500));
      return res.status(502).json({ error: 'Error al generar visualización', detail: data.error || 'Unknown error' });
    }

    const outputUrl = Array.isArray(data.output) ? data.output[0] : data.output;

    if (!outputUrl) {
      console.error('Replicate: no output in response', JSON.stringify(data).slice(0, 500));
      return res.status(502).json({ error: 'No se recibió imagen de la IA' });
    }

    res.json({ image: outputUrl });
  } catch (err) {
    console.error('Visualize error:', err.message);
    res.status(500).json({ error: 'Error interno al procesar la imagen' });
  }
});

module.exports = router;

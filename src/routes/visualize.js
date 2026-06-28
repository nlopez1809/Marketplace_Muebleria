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

    const base64Data = roomImage.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    const prompt = `Ultra-realistic interior design photograph. Place a ${productName || 'elegant furniture piece'} (${productDescription || 'premium quality furniture'}) into this exact room, perfectly proportional to the real dimensions of the space. The furniture must match the room's perspective, vanishing points, lighting direction, shadow angles and color temperature. Add subtle decorative details that complement the existing style: a textured throw blanket, decorative cushions, a small plant or vase nearby, and a soft area rug if appropriate. Photorealistic, interior design magazine quality, 8K, natural lighting.`;

    const negativePrompt = 'blurry, distorted, low quality, cartoon, drawing, painting, watermark, text, logo, unrealistic, floating furniture, disproportionate, deformed, out of frame';

    const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);
    const CRLF = '\r\n';

    const paramsPart =
      '--' + boundary + CRLF +
      'Content-Disposition: form-data; name="parameters"' + CRLF +
      'Content-Type: application/json' + CRLF + CRLF +
      JSON.stringify({
        prompt: prompt,
        negative_prompt: negativePrompt,
        strength: 0.45,
        guidance_scale: 7.5,
        num_inference_steps: 30,
      }) + CRLF;

    const imageHeader =
      '--' + boundary + CRLF +
      'Content-Disposition: form-data; name="inputs"; filename="room.png"' + CRLF +
      'Content-Type: image/png' + CRLF + CRLF;

    const imageFooter = CRLF + '--' + boundary + '--' + CRLF;

    const body = Buffer.concat([
      Buffer.from(paramsPart, 'utf-8'),
      Buffer.from(imageHeader, 'utf-8'),
      imageBuffer,
      Buffer.from(imageFooter, 'utf-8'),
    ]);

    const response = await fetch('https://api-inference.huggingface.co/models/timbrooks/instruct-pix2pix', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'multipart/form-data; boundary=' + boundary,
      },
      body: body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('HuggingFace error:', response.status, errorText);
      return res.status(502).json({ error: 'Error al generar visualización', detail: errorText });
    }

    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('image')) {
      const buffer = await response.arrayBuffer();
      const resultBase64 = Buffer.from(buffer).toString('base64');
      const imgType = contentType.includes('jpeg') ? 'jpeg' : 'png';
      return res.json({ image: 'data:image/' + imgType + ';base64,' + resultBase64 });
    }

    const data = await response.json();
    if (data.error) {
      console.error('HuggingFace API error:', data.error);
      return res.status(502).json({ error: 'Error al generar visualización', detail: data.error });
    }

    res.json({ image: data });
  } catch (err) {
    console.error('Visualize error:', err.message);
    res.status(500).json({ error: 'Error interno al procesar la imagen' });
  }
});

module.exports = router;

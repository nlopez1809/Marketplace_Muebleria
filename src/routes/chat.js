const express = require('express');
const router = express.Router();
const { chat } = require('../services/ai');
const storage = require('../services/storage');
const supabase = require('../services/supabase');
const SYSTEM_PROMPT = require('../config/prompt');

let asesorIndex = 0;

async function getAsesorDeTurno() {
  const asesores = await storage.getAsesores();
  if (!asesores.length) return { nombre: 'Asesor', telefono: '+591 70000000' };
  const asesor = asesores[asesorIndex % asesores.length];
  asesorIndex++;
  return asesor;
}

router.post('/', async (req, res) => {
  const { message, sessionId, history } = req.body;

  if (!message || !sessionId) {
    return res.status(400).json({ error: 'message y sessionId son requeridos' });
  }

  const chatHistory = Array.isArray(history) ? history : [];

  const asesor = await getAsesorDeTurno();

  const dynamicPrompt = SYSTEM_PROMPT + `\n\n## ASESOR DE TURNO\nEl asesor asignado a esta conversación es **${asesor.nombre}** (teléfono: ${asesor.telefono}). Usa estos datos cuando debas derivar al cliente.`;

  try {
    const result = await chat(message, chatHistory, dynamicPrompt);
    let assistantMessage = result.text;

    const leadMatch = assistantMessage.match(/<!--LEAD:(.*?)-->/);
    if (leadMatch) {
      try {
        const leadData = JSON.parse(leadMatch[1]);
        const { data: existing } = await supabase
          .from('leads')
          .select('*')
          .eq('session_id', sessionId)
          .single();

        if (existing) {
          const updates = { updated_at: new Date().toISOString() };
          if (leadData.nombre) updates.nombre = leadData.nombre;
          if (leadData.telefono) updates.telefono = leadData.telefono;
          if (leadData.ci) updates.ci = leadData.ci;
          await supabase.from('leads').update(updates).eq('session_id', sessionId);
        } else {
          await storage.createLead({
            session_id: sessionId,
            nombre: leadData.nombre || '',
            telefono: leadData.telefono || '',
            ci: leadData.ci || '',
            producto_interes: '',
          });
        }
      } catch (e) { console.error('Error parsing lead:', e.message); }
      assistantMessage = assistantMessage.replace(/<!--LEAD:.*?-->/g, '').trim();
    }

    res.json({ reply: assistantMessage, tokens: result.tokens });
  } catch (error) {
    console.error('Error calling AI:', error.message);
    res.status(500).json({ error: 'Error al procesar tu mensaje. Intenta de nuevo.' });
  }
});

router.post('/reset', (req, res) => {
  res.json({ ok: true });
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { chat } = require('../services/ai');
const storage = require('../services/storage');
const SYSTEM_PROMPT = require('../config/prompt');

const TOKEN_LIMIT = 100000;
const conversations = new Map();
const tokenUsage = new Map();
const sessionAdvisor = new Map();
let asesorIndex = 0;

function getAsesorDeTurno() {
  const data = storage.load();
  const asesor = data.asesores[asesorIndex % data.asesores.length];
  asesorIndex++;
  return asesor;
}

router.post('/', async (req, res) => {
  const { message, sessionId } = req.body;

  if (!message || !sessionId) {
    return res.status(400).json({ error: 'message y sessionId son requeridos' });
  }

  const used = tokenUsage.get(sessionId) || 0;
  if (used >= TOKEN_LIMIT) {
    return res.json({ reply: 'Has alcanzado el límite de esta sesión. Por favor, contáctanos por WhatsApp al +591 70000000 para seguir conversando. ¡Será un gusto atenderte! 😊' });
  }

  if (!conversations.has(sessionId)) {
    conversations.set(sessionId, []);
  }

  if (!sessionAdvisor.has(sessionId)) {
    sessionAdvisor.set(sessionId, getAsesorDeTurno());
  }
  const asesor = sessionAdvisor.get(sessionId);

  const history = conversations.get(sessionId);
  history.push({ role: 'user', content: message });

  const dynamicPrompt = SYSTEM_PROMPT + `\n\n## ASESOR DE TURNO\nEl asesor asignado a esta conversación es **${asesor.nombre}** (teléfono: ${asesor.telefono}). Usa estos datos cuando debas derivar al cliente.`;

  try {
    const result = await chat(message, history, dynamicPrompt);
    let assistantMessage = result.text;

    const leadMatch = assistantMessage.match(/<!--LEAD:(.*?)-->/);
    if (leadMatch) {
      try {
        const leadData = JSON.parse(leadMatch[1]);
        const data = storage.load();
        const existing = data.leads.find(l => l.sessionId === sessionId);
        if (existing) {
          if (leadData.nombre) existing.nombre = leadData.nombre;
          if (leadData.telefono) existing.telefono = leadData.telefono;
          if (leadData.ci) existing.ci = leadData.ci;
          existing.updatedAt = new Date().toISOString();
        } else {
          data.leads.push({
            id: Date.now(),
            sessionId,
            nombre: leadData.nombre || '',
            telefono: leadData.telefono || '',
            ci: leadData.ci || '',
            productoInteres: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
        storage.save(data);
      } catch (e) { console.error('Error parsing lead:', e.message); }
      assistantMessage = assistantMessage.replace(/<!--LEAD:.*?-->/g, '').trim();
    }

    history.push({ role: 'assistant', content: assistantMessage });

    tokenUsage.set(sessionId, used + result.tokens);

    if (history.length > 40) {
      history.splice(0, 2);
    }

    res.json({ reply: assistantMessage, tokensUsed: used + result.tokens, tokenLimit: TOKEN_LIMIT });
  } catch (error) {
    console.error('Error calling AI:', error.message);
    res.status(500).json({ error: 'Error al procesar tu mensaje. Intenta de nuevo.' });
  }
});

router.post('/reset', (req, res) => {
  const { sessionId } = req.body;
  if (sessionId) {
    conversations.delete(sessionId);
    tokenUsage.delete(sessionId);
    sessionAdvisor.delete(sessionId);
  }
  res.json({ ok: true });
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { chat } = require('../services/ai');
const storage = require('../services/storage');
const supabase = require('../services/supabase');
const SYSTEM_PROMPT = require('../config/prompt');
const chrono = require('chrono-node');

function parseFechaVisita(texto) {
  if (!texto) return null;
  try {
    const parsed = chrono.es.parseDate(texto, new Date());
    if (parsed) return parsed.toISOString();
  } catch (e) {}
  return null;
}

let asesorIndex = 0;

function buildVisitaLinks(v, asesor) {
  // Fecha/hora: intentar parsear lo que diga el agente, sino usar mañana 10am
  let startDate = new Date();
  startDate.setDate(startDate.getDate() + 1);
  startDate.setHours(10, 0, 0, 0);

  if (v.fecha) {
    const parts = v.fecha.split('/');
    if (parts.length >= 2) {
      const d = parseInt(parts[0]);
      const m = parseInt(parts[1]) - 1;
      const y = parts[2] ? parseInt(parts[2]) : startDate.getFullYear();
      if (!isNaN(d) && !isNaN(m)) startDate = new Date(y, m, d, 10, 0, 0);
    }
  }
  if (v.hora) {
    const hm = v.hora.match(/(\d{1,2})[:\.]?(\d{0,2})/);
    if (hm) {
      startDate.setHours(parseInt(hm[1]), parseInt(hm[2] || '0'), 0, 0);
    }
  }

  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
  const fmt = d => d.toISOString().replace(/[-:]/g,'').split('.')[0] + 'Z';

  const productos = Array.isArray(v.productos) ? v.productos : [];
  const productosList = productos.map(p => `• ${p.nombre}${p.precio ? ' — Bs ' + p.precio : ''}`).join('\n');

  const calTitle = encodeURIComponent('Visita InCassa DECO — ' + (v.nombre || 'Cliente'));
  const calDetails = encodeURIComponent(
    `Visita agendada por Deco IA para ${v.nombre || 'cliente'}.\n\nProductos de interés:\n${productosList}\n\nAsesor: ${asesor.nombre} — ${asesor.telefono}`
  );
  const calLocation = encodeURIComponent('InCassa DECO — Tienda');
  const calUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${calTitle}&dates=${fmt(startDate)}/${fmt(endDate)}&details=${calDetails}&location=${calLocation}`;

  const fechaStr = v.fecha || startDate.toLocaleDateString('es-BO');
  const horaStr = v.hora || startDate.toLocaleTimeString('es-BO', {hour:'2-digit',minute:'2-digit'});

  // Mensaje al CLIENTE
  const waMsgCliente = encodeURIComponent(
    `¡Hola ${v.nombre || ''}! 👋 Te confirmamos tu visita a InCassa DECO.\n\n📅 *Fecha:* ${fechaStr} a las ${horaStr}\n📍 *Tienda:* InCassa DECO\n\n🛋️ *Productos que te interesan:*\n${productosList}\n\n¡Te esperamos! Cualquier consulta respondemos aquí 😊`
  );
  const waUrlCliente = `https://wa.me/${(v.telefono || '').replace(/\D/g,'')}?text=${waMsgCliente}`;

  // Mensaje al ASESOR
  const waMsgAsesor = encodeURIComponent(
    `📋 *Nuevo lead agendado — Deco IA*\n\n👤 *Cliente:* ${v.nombre || '—'}\n📱 *WhatsApp:* ${v.telefono || '—'}\n📅 *Visita:* ${fechaStr} a las ${horaStr}\n\n🛋️ *Productos de interés:*\n${productosList}\n\n_Agendado por Deco IA_`
  );
  const waUrlAsesor = `https://wa.me/${(asesor.telefono || '').replace(/\D/g,'')}?text=${waMsgAsesor}`;

  return {
    nombre: v.nombre,
    telefono: v.telefono,
    fecha: fechaStr,
    hora: horaStr,
    productos,
    asesorNombre: asesor.nombre,
    calendarUrl: calUrl,
    whatsappClienteUrl: waUrlCliente,
    whatsappAsesorUrl: waUrlAsesor,
  };
}

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

    // Guardar raw antes de limpiar
    const rawMessage = result.text;

    // ── Limpiar etiquetas siempre — varios formatos posibles ──
    assistantMessage = assistantMessage.replace(/<!--LEAD:[\s\S]*?-->/g, '');
    assistantMessage = assistantMessage.replace(/<!--VISITA:[\s\S]*?-->/g, '');
    // Por si el modelo escribe sin los comentarios HTML
    assistantMessage = assistantMessage.replace(/VISITA:\s*\{[\s\S]*?\}(\s*→)?/g, '');
    assistantMessage = assistantMessage.replace(/LEAD:\s*\{[\s\S]*?\}/g, '');
    assistantMessage = assistantMessage.trim();

    // ── Procesar LEAD ──
    const leadMatch = rawMessage.match(/<!--LEAD:([\s\S]*?)-->/);
    console.log('[LEAD match]', !!leadMatch);
    console.log('[VISITA match]', !!rawMessage.match(/<!--VISITA:([\s\S]*?)-->/));
    console.log('[RAW snippet]', rawMessage.slice(-300));
    if (leadMatch) {
      try {
        const leadData = JSON.parse(leadMatch[1]);
        console.log('[LEAD data]', leadData);
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
          if (leadData.productos_interes) updates.producto_interes = leadData.productos_interes;
          if (leadData.fecha_visita) {
            const iso = parseFechaVisita(leadData.fecha_visita);
            updates.fecha_visita = iso || leadData.fecha_visita;
          }
          await supabase.from('leads').update(updates).eq('session_id', sessionId);
        } else {
          await storage.createLead({
            session_id: sessionId,
            nombre: leadData.nombre || '',
            telefono: leadData.telefono || '',
            ci: leadData.ci || '',
            producto_interes: leadData.productos_interes || '',
          });
        }
      } catch (e) { console.error('Error parsing lead:', e.message); }
    }

    // ── Procesar VISITA ──
    let visitaPayload = null;
    const visitaMatch = rawMessage.match(/<!--VISITA:([\s\S]*?)-->/);
    if (visitaMatch) {
      try {
        const v = JSON.parse(visitaMatch[1]);
        console.log('[VISITA data]', v);
        visitaPayload = buildVisitaLinks(v, asesor);

        // Guardar fecha_visita y productos en el lead
        const textoFecha = [v.fecha, v.hora].filter(Boolean).join(' ');
        const fechaVisita = parseFechaVisita(textoFecha) || textoFecha || 'Por confirmar';
        const productosStr = (v.productos || []).map(p => p.nombre + (p.precio ? ' Bs ' + p.precio : '')).join(', ');
        const { data: existingLead } = await supabase.from('leads').select('id').eq('session_id', sessionId).single();
        if (existingLead) {
          await supabase.from('leads').update({
            fecha_visita: fechaVisita,
            producto_interes: productosStr,
            updated_at: new Date().toISOString()
          }).eq('session_id', sessionId);
        } else {
          await storage.createLead({
            session_id: sessionId,
            nombre: v.nombre || '',
            telefono: v.telefono || '',
            ci: '',
            producto_interes: productosStr,
            fecha_visita: fechaVisita,
          });
        }
      } catch (e) { console.error('Error parsing visita:', e.message); }
    }

    res.json({ reply: assistantMessage, tokens: result.tokens, visita: visitaPayload });
  } catch (error) {
    console.error('Error calling AI:', error.message);
    res.status(500).json({ error: 'Error al procesar tu mensaje. Intenta de nuevo.' });
  }
});

router.post('/reset', (req, res) => {
  res.json({ ok: true });
});

module.exports = router;

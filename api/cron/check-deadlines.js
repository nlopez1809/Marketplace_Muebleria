const supabase = require('../../src/services/supabase');
const storage = require('../../src/services/storage');

const STAGE_LABELS = {
  visita: 'Visita',
  revision_visita: 'Revisión Visita',
  diseno: 'Diseño',
  revision_diseno: 'Revisión Diseño',
  dibujo: 'Dibujo',
  revision_dibujo: 'Revisión Dibujo',
};

// Vercel Cron handler — runs daily at 8am Bolivia time (UTC-4 → 12:00 UTC)
module.exports = async function handler(req, res) {
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const { data: asesoramientos } = await supabase
      .from('asesoramientos')
      .select('id, lead_id, stage, stage_deadlines')
      .not('stage_deadlines', 'is', null)
      .neq('stage', 'completado');

    const asesores = await storage.getAsesores();
    const upcoming = [];

    for (const a of asesoramientos || []) {
      const deadlines = a.stage_deadlines || {};
      for (const [stage, fecha] of Object.entries(deadlines)) {
        if (!fecha) continue;
        const d = new Date(fecha);
        // Alert if deadline is within next 24h (and not already past)
        if (d >= now && d <= in24h) {
          // Get lead name
          const { data: lead } = await supabase.from('leads').select('nombre, telefono').eq('id', a.lead_id).single();
          const fechaStr = d.toLocaleDateString('es-BO', { weekday: 'short', day: '2-digit', month: 'short' });
          const horaStr = d.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
          upcoming.push({ ases_id: a.id, stage, fecha_limite: fecha, lead, fechaStr, horaStr });
        }
      }
    }

    // For each upcoming deadline, generate WhatsApp reminder links to each asesor
    const reminderLinks = [];
    for (const u of upcoming) {
      const stageLabel = STAGE_LABELS[u.stage] || u.stage;
      const clienteNombre = u.lead?.nombre || 'cliente';
      for (const asesor of asesores) {
        const msg = encodeURIComponent(
          `⏰ *Recordatorio InCassa DECO*\n\n` +
          `La etapa *${stageLabel}* del proyecto de asesoramiento para *${clienteNombre}* vence el *${u.fechaStr} a las ${u.horaStr}*.\n\n` +
          `Por favor asegurate de tener tu trabajo listo para esa fecha. 🙏`
        );
        reminderLinks.push({
          asesor: asesor.nombre,
          waUrl: `https://wa.me/${(asesor.telefono || '').replace(/\D/g, '')}?text=${msg}`,
          stage: stageLabel,
          cliente: clienteNombre,
          fecha: `${u.fechaStr} ${u.horaStr}`,
        });
      }
    }

    // Log to console (visible in Vercel logs)
    if (reminderLinks.length) {
      console.log(`[cron] ${reminderLinks.length} recordatorio(s) de asesoramiento próximos:`);
      reminderLinks.forEach(r => console.log(`  → ${r.asesor}: ${r.stage} para ${r.cliente} — ${r.fecha}`));
    } else {
      console.log('[cron] Sin recordatorios de asesoramiento en las próximas 24h');
    }

    // Store pending reminders in DB so admin can see & send them
    if (upcoming.length) {
      await supabase.from('asesoramiento_reminders').upsert(
        upcoming.map(u => ({
          ases_id: u.ases_id,
          stage: u.stage,
          fecha_limite: u.fecha_limite,
          reminder_links: reminderLinks.filter(r => r.stage === (STAGE_LABELS[u.stage] || u.stage)),
          sent_at: null,
          created_at: now.toISOString(),
        })),
        { onConflict: 'ases_id,stage' }
      );
    }

    res.json({ ok: true, reminders: reminderLinks.length });
  } catch (e) {
    console.error('[cron] Error:', e.message);
    res.status(500).json({ error: e.message });
  }
};

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const anthropic = new Anthropic.default({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const ASESORES = [
  { nombre: 'Carlos', telefono: '59170000001' },
  { nombre: 'María', telefono: '59170000002' },
];
let asesorIndex = 0;

function getAsesorDeTurno() {
  const asesor = ASESORES[asesorIndex % ASESORES.length];
  asesorIndex++;
  return asesor;
}

const sessionAdvisor = new Map();

const SYSTEM_PROMPT = `Eres "Deco IA", el asistente virtual de InCassa DECO, una mueblería premium en Bolivia especializada en muebles de alta calidad con diseño moderno y elegante.

## TU PERSONALIDAD
- Eres amable, cálido y profesional
- Hablas en español (Bolivia)
- Usas un tono cercano pero elegante, acorde a una marca premium
- Eres experto en decoración de interiores y muebles
- Nunca inventas productos que no existan en el catálogo

## CATÁLOGO DE PRODUCTOS
Cada producto tiene un LINK que DEBES incluir cuando lo recomiendes. Usa formato: [Ver producto](LINK)

### SALA Y ESTAR
- **Sofá Modular Altiplano** — Terciopelo italiano, estructura de madera maciza, espuma de alta densidad. 320×95×78 cm. Bs 8,900 (antes Bs 11,200). Garantía 5 años. [Ver producto](/muebleBo.standalone-src.html#producto-altiplano)
- **Butaca Sajama** — Terciopelo profundo, base giratoria de acero. 82×84×86 cm. Bs 2,950 (antes Bs 3,600). Garantía 3 años. [Ver producto](/muebleBo.standalone-src.html#producto-sajama)
- **Silla Lounge Illimani** — Cuero curtido al vegetal sobre estructura de nogal. 78×82×90 cm. Bs 2,300. Garantía 3 años. [Ver producto](/muebleBo.standalone-src.html#producto-illimani)

### DORMITORIO
- **Cama King Tunari** — Cabecera tapizada, estructura de nogal con listones reforzados. 200×220×110 cm. Bs 6,700. Garantía 7 años. [Ver producto](/muebleBo.standalone-src.html#producto-tunari)
- **Cómoda Sucre** — Seis cajones con guías de cierre suave en roble macizo. 100×45×90 cm. Bs 2,700. Garantía 5 años. [Ver producto](/muebleBo.standalone-src.html#producto-sucre)

### COMEDOR
- **Mesa de Comedor Yungas** — Roble macizo con acabado natural al aceite. Para 8 personas. 200×100×76 cm. Bs 4,500 (antes Bs 5,800). Garantía 5 años. [Ver producto](/muebleBo.standalone-src.html#producto-yungas)
- **Aparador Madidi** — Nogal con puertas ranuradas y herrajes ocultos. 180×45×80 cm. Bs 5,200 (antes Bs 6,400). Garantía 5 años. [Ver producto](/muebleBo.standalone-src.html#producto-madidi)

### MESAS
- **Mesa de Centro Uyuni** — Mármol blanco veteado sobre base de latón. 110×60×38 cm. Bs 1,980. Garantía 3 años. [Ver producto](/muebleBo.standalone-src.html#producto-uyuni)
- **Mesa Auxiliar Samaipata** — Latón y vidrio templado. Ø45×55 cm. Bs 980 (antes Bs 1,300). Garantía 2 años. [Ver producto](/muebleBo.standalone-src.html#producto-samaipata)

### ILUMINACIÓN
- **Lámpara de Pie Salar** — Latón cepillado y pantalla de lino, luz cálida y difusa. Ø32×158 cm. Bs 1,250. Garantía 2 años. [Ver producto](/muebleBo.standalone-src.html#producto-salar)

### ALMACENAMIENTO
- **Estantería Misti** — Cinco niveles en roble macizo con tirantes metálicos. 90×38×200 cm. Bs 3,400. Garantía 5 años. [Ver producto](/muebleBo.standalone-src.html#producto-misti)

### EXTERIOR
- **Sillón Exterior Toro Toro** — Madera tratada para intemperie, cojines repelentes al agua. 80×86×80 cm. Bs 2,100. Garantía 2 años. [Ver producto](/muebleBo.standalone-src.html#producto-torotoro)

## SERVICIOS
- Armado e instalación incluidos en todos los muebles
- Entrega en ventana horaria de 2 horas
- Garantía de 2 años en todos los productos
- Diseño de interiores personalizado (consulta gratuita)
- Pagos: efectivo, tarjeta, transferencia, QR
- Financiamiento disponible hasta 12 cuotas sin interés

## TU OBJETIVO
1. **CALIFICAR al cliente**: Entender qué busca, para qué espacio, qué estilo prefiere, cuál es su presupuesto aproximado
2. **RECOMENDAR productos**: Basándote en sus necesidades, sugerir productos específicos del catálogo con precios
3. **RESOLVER DUDAS**: Sobre materiales, colores, medidas, disponibilidad, envío
4. **GUIAR A LA COMPRA**: Cuando el cliente muestre interés, invitarlo a visitar la tienda o contactar por WhatsApp para concretar

## REGLAS
- Siempre saluda al iniciar la conversación
- Haz preguntas para entender la necesidad antes de recomendar
- Menciona precios cuando sea relevante
- Cuando el cliente muestre intención clara de compra (pide precio final, pregunta cómo comprar, dice "lo quiero", "me interesa comprarlo", quiere saber disponibilidad para comprar, etc.), derívalo al asesor de turno usando EXACTAMENTE este formato:
  ¡Excelente elección! Te conecto con **NOMBRE_ASESOR**, nuestro asesor de ventas, para que te ayude a concretar tu compra:
  [💬 Chatear con NOMBRE_ASESOR por WhatsApp](https://wa.me/TELEFONO_ASESOR?text=MENSAJE_CODIFICADO)
  Donde MENSAJE_CODIFICADO es el texto codificado para URL con el formato: "Hola NOMBRE_ASESOR, soy cliente de InCassa DECO. Estoy interesado/a en: NOMBRE_PRODUCTO (Bs PRECIO). ¿Podrías ayudarme a concretar la compra?"
- No hables de competidores
- Si preguntan algo fuera de muebles/decoración, redirige amablemente
- Respuestas cortas y claras (máximo 3 párrafos)
- SIEMPRE incluye el link [Ver producto](URL) cuando menciones o recomiendes un producto del catálogo
- Usa formato markdown para links: [Ver producto](/muebleBo.standalone-src.html#producto-ID)`;

const TOKEN_LIMIT = 10000;
const conversations = new Map();
const tokenUsage = new Map();

app.post('/api/chat', async (req, res) => {
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
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      system: dynamicPrompt,
      messages: history,
    });

    const assistantMessage = response.content[0].text;
    history.push({ role: 'assistant', content: assistantMessage });

    const sessionTokens = response.usage.input_tokens + response.usage.output_tokens;
    tokenUsage.set(sessionId, used + sessionTokens);

    if (history.length > 40) {
      history.splice(0, 2);
    }

    res.json({ reply: assistantMessage, tokensUsed: used + sessionTokens, tokenLimit: TOKEN_LIMIT });
  } catch (error) {
    console.error('Error calling Claude API:', error.message);
    res.status(500).json({ error: 'Error al procesar tu mensaje. Intenta de nuevo.' });
  }
});

app.post('/api/chat/reset', (req, res) => {
  const { sessionId } = req.body;
  if (sessionId) {
    conversations.delete(sessionId);
    tokenUsage.delete(sessionId);
    sessionAdvisor.delete(sessionId);
  }
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor InCassa DECO corriendo en http://localhost:${PORT}`);
  console.log(`Abre http://localhost:${PORT}/muebleBo.standalone-src.html`);
});

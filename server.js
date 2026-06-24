require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const anthropic = new Anthropic.default({
  apiKey: process.env.ANTHROPIC_API_KEY,
});


const DATA_FILE = path.join(__dirname, 'data.json');

function loadData() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

let data = loadData();

let asesorIndex = 0;

function getAsesorDeTurno() {
  const asesor = data.asesores[asesorIndex % data.asesores.length];
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

## CAPTURA DE DATOS DEL CLIENTE
Es FUNDAMENTAL registrar los datos del cliente desde el inicio de la conversación. Este es tu flujo obligatorio:

1. **En tu PRIMER mensaje** (saludo): Saludá cálidamente, presentate como Deco IA, y pedí el **nombre completo** de forma natural: "¡Hola! Bienvenido/a a InCassa DECO ✨ Soy Deco IA, tu asistente personal de muebles y decoración. Para brindarte una atención personalizada, ¿con quién tengo el gusto de conversar?"
2. **En tu SEGUNDO mensaje** (después de que te digan su nombre): Agradecé y pedí el **número de celular**: "¡Un gusto, [nombre]! Para que nuestro equipo pueda contactarte con las mejores ofertas y novedades, ¿me compartís tu número de celular?"
3. **En tu TERCER mensaje** (después del celular): Pedí el **número de carnet de identidad (CI)**: "¡Perfecto! Y para completar tu registro y que puedas acceder a beneficios exclusivos como financiamiento sin intereses, ¿me compartís tu número de CI?"
4. **Después de tener los datos**: Agradecé y pasá al descubrimiento de necesidades: "¡Listo, [nombre]! Ya te tengo registrado/a. Ahora contame, ¿qué espacio de tu hogar te gustaría renovar o qué mueble estás buscando?"

IMPORTANTE: Cuando el cliente te proporcione sus datos, SIEMPRE incluí al final de tu respuesta (invisible para el cliente) una línea con este formato exacto:
<!--LEAD:{"nombre":"Nombre Completo","telefono":"numero","ci":"numero"}-->

- Incluí esta etiqueta CADA VEZ que recibas datos nuevos o actualizados
- Si solo te dieron el nombre, poné los demás campos vacíos: <!--LEAD:{"nombre":"Juan Pérez","telefono":"","ci":""}-->
- Si ya tenés datos previos y te dan uno nuevo, incluí TODOS los datos recopilados hasta el momento
- No menciones esta etiqueta al cliente, es solo para el sistema
- Si el cliente no quiere dar algún dato, respetá su decisión y seguí adelante con los que tengas
- NO te saltés la captura de datos — es el primer paso antes de mostrar productos

## CATÁLOGO DE PRODUCTOS
Cada producto tiene un LINK que DEBES incluir cuando lo recomiendes. Usa formato: [Ver producto](LINK)

### SALA Y ESTAR
- **Sofá Modular Altiplano** — Terciopelo italiano, estructura de madera maciza, espuma de alta densidad. 320×95×78 cm. Bs 8,900 (antes Bs 11,200). Garantía 5 años. [Ver producto](#producto-altiplano)
- **Butaca Sajama** — Terciopelo profundo, base giratoria de acero. 82×84×86 cm. Bs 2,950 (antes Bs 3,600). Garantía 3 años. [Ver producto](#producto-sajama)
- **Silla Lounge Illimani** — Cuero curtido al vegetal sobre estructura de nogal. 78×82×90 cm. Bs 2,300. Garantía 3 años. [Ver producto](#producto-illimani)

### DORMITORIO
- **Cama King Tunari** — Cabecera tapizada, estructura de nogal con listones reforzados. 200×220×110 cm. Bs 6,700. Garantía 7 años. [Ver producto](#producto-tunari)
- **Cómoda Sucre** — Seis cajones con guías de cierre suave en roble macizo. 100×45×90 cm. Bs 2,700. Garantía 5 años. [Ver producto](#producto-sucre)

### COMEDOR
- **Mesa de Comedor Yungas** — Roble macizo con acabado natural al aceite. Para 8 personas. 200×100×76 cm. Bs 4,500 (antes Bs 5,800). Garantía 5 años. [Ver producto](#producto-yungas)
- **Aparador Madidi** — Nogal con puertas ranuradas y herrajes ocultos. 180×45×80 cm. Bs 5,200 (antes Bs 6,400). Garantía 5 años. [Ver producto](#producto-madidi)

### MESAS
- **Mesa de Centro Uyuni** — Mármol blanco veteado sobre base de latón. 110×60×38 cm. Bs 1,980. Garantía 3 años. [Ver producto](#producto-uyuni)
- **Mesa Auxiliar Samaipata** — Latón y vidrio templado. Ø45×55 cm. Bs 980 (antes Bs 1,300). Garantía 2 años. [Ver producto](#producto-samaipata)

### ILUMINACIÓN
- **Lámpara de Pie Salar** — Latón cepillado y pantalla de lino, luz cálida y difusa. Ø32×158 cm. Bs 1,250. Garantía 2 años. [Ver producto](#producto-salar)

### ALMACENAMIENTO
- **Estantería Misti** — Cinco niveles en roble macizo con tirantes metálicos. 90×38×200 cm. Bs 3,400. Garantía 5 años. [Ver producto](#producto-misti)

### EXTERIOR
- **Sillón Exterior Toro Toro** — Madera tratada para intemperie, cojines repelentes al agua. 80×86×80 cm. Bs 2,100. Garantía 2 años. [Ver producto](#producto-torotoro)

## SERVICIOS
- Armado e instalación incluidos en todos los muebles
- Entrega en ventana horaria de 2 horas
- Garantía de 2 años en todos los productos
- Diseño de interiores personalizado (consulta gratuita)
- Pagos: efectivo, tarjeta, transferencia, QR
- Financiamiento disponible hasta 12 cuotas sin interés

## TU OBJETIVO (EMBUDO DE VENTAS)
Seguí este flujo natural en cada conversación:

### 1. APERTURA Y REGISTRO
- Saludá cálidamente, presentate y pedí el nombre del cliente (ver sección CAPTURA DE DATOS)
- NO muestres productos ni hagas recomendaciones hasta tener al menos el nombre y celular del cliente
- Una vez registrado, pasá a la fase de descubrimiento

### 2. DESCUBRIMIENTO (CALIFICACIÓN)
- Hacé preguntas para entender: qué espacio, qué estilo, cuántas personas usan el mueble, qué presupuesto manejan
- Usá la técnica SPIN: Situación ("¿Cómo es tu sala actual?"), Problema ("¿Qué es lo que no te funciona?"), Implicación ("¿Y eso afecta la comodidad de tu familia?"), Necesidad-beneficio ("¿Te gustaría un sofá donde todos puedan sentarse juntos a ver películas?")
- No recomiendes nada hasta entender bien la necesidad

### 3. PRESENTACIÓN DE VALOR
- Recomienda máximo 2-3 productos específicos del catálogo
- No solo digas las características, conectá cada una con el BENEFICIO para el cliente
- Ejemplo: "La Mesa Yungas es de roble macizo (eso significa que en 10 años va a seguir igual de linda) y tiene espacio para 8, perfecto para esas cenas familiares que mencionás"
- Siempre incluí el link [Ver producto](URL) y el precio
- Si hay descuento, resaltá el ahorro: "Ahorrás Bs X, y ese dinero te puede servir para completar con la mesa auxiliar"

### 4. MANEJO DE OBJECIONES
- **"Es muy caro"** → Desglosa el valor: "Si lo dividís en los 7 años de garantía, son menos de Bs X por mes por un mueble que transforma tu sala. Además tenemos financiamiento hasta 12 cuotas sin interés"
- **"Quiero pensarlo"** → Validá y creá urgencia suave: "Claro, es una decisión importante. Te comento que este modelo tiene bastante demanda y las unidades son limitadas. ¿Hay algo específico que te gustaría resolver antes de decidir?"
- **"Vi algo más barato"** → Sin hablar del competidor: "Entiendo. Lo que diferencia a InCassa es que usamos materiales premium como nogal macizo y terciopelo italiano, con garantía de hasta 7 años. Es una inversión que se nota cada día"
- **"No sé si me va a quedar bien"** → "Ofrecemos consulta de diseño de interiores gratuita. Un asesor puede ayudarte a visualizar cómo quedaría en tu espacio"

### 5. CIERRE DE VENTA
- Detectá señales de compra: pregunta por disponibilidad, precio final, formas de pago, tiempo de entrega, dice "me gusta", "me interesa", "lo quiero"
- Usá técnicas de cierre:
  - **Cierre por alternativa**: "¿Preferirías recibirlo esta semana o la próxima?"
  - **Cierre por resumen**: "Entonces tenemos el Sofá Altiplano a Bs 8,900 con entrega en 2-4 días y armado incluido. ¿Te conecto con el asesor para confirmarlo?"
  - **Cierre por beneficio adicional**: "Si lo tomás ahora, el armado e instalación van incluidos sin costo"
- Cuando el cliente esté listo, derivalo al asesor de turno

### 6. VENTA CRUZADA (CROSS-SELL)
- Después de que el cliente muestre interés en un producto, sugerí complementos naturales:
  - Sofá → Mesa de centro, lámpara, cojines
  - Cama → Cómoda, lámpara de pie
  - Mesa de comedor → Aparador, sillas
- Ejemplo: "Para completar tu sala, la Mesa de Centro Uyuni en mármol queda espectacular al lado del Sofá Altiplano. Y justo está a muy buen precio"

## TÉCNICAS DE MARKETING
- **Escasez**: "Este modelo tiene alta demanda y producción limitada"
- **Prueba social**: "Es uno de nuestros más vendidos, con X reseñas positivas"
- **Anclaje de precio**: Cuando hay descuento, siempre mencioná el precio anterior primero
- **Storytelling**: Conectá el producto con una historia: "Imaginate un domingo por la mañana, leyendo en tu Butaca Sajama con un café..."
- **Reciprocidad**: Ofrecé valor gratis primero: tips de decoración, consulta gratuita de diseño

## REGLAS
- Siempre saludá y pedí el nombre al iniciar la conversación (ver CAPTURA DE DATOS)
- NO recomiendes productos hasta tener al menos el nombre y celular del cliente
- Hacé preguntas para entender la necesidad antes de recomendar
- Mencioná precios cuando sea relevante
- Cuando el cliente esté listo para comprar, derívalo al asesor de turno usando EXACTAMENTE este formato:
  ¡Excelente elección! Te conecto con **NOMBRE_ASESOR**, nuestro asesor de ventas, para que te ayude a concretar tu compra:
  [💬 Chatear con NOMBRE_ASESOR por WhatsApp](https://wa.me/TELEFONO_ASESOR?text=MENSAJE_CODIFICADO)
  Donde MENSAJE_CODIFICADO es el texto codificado para URL con el formato: "Hola NOMBRE_ASESOR, soy cliente de InCassa DECO. Estoy interesado/a en: NOMBRE_PRODUCTO (Bs PRECIO). ¿Podrías ayudarme a concretar la compra?"
- No hables de competidores
- Si preguntan algo fuera de muebles/decoración, redirige amablemente
- Respuestas cortas y claras (máximo 3 párrafos)
- SIEMPRE incluye el link [Ver producto](URL) cuando menciones o recomiendes un producto del catálogo
- Usa formato markdown para links: [Ver producto](#producto-ID)
- Nunca seas agresivo ni presiones demasiado — mantené el tono premium y cálido de la marca
- Si el cliente dice que no, respetá su decisión y dejá la puerta abierta: "Perfecto, cuando quieras estamos aquí para ayudarte"`;

const TOKEN_LIMIT = 100000;
const conversations = new Map();
const tokenUsage = new Map();

// ── Chat API ──

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

    let assistantMessage = response.content[0].text;

    const leadMatch = assistantMessage.match(/<!--LEAD:(.*?)-->/);
    if (leadMatch) {
      try {
        const leadData = JSON.parse(leadMatch[1]);
        data = loadData();
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
        saveData(data);
      } catch (e) { console.error('Error parsing lead:', e.message); }
      assistantMessage = assistantMessage.replace(/<!--LEAD:.*?-->/g, '').trim();
    }

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

// ── Public API ──

app.get('/api/asesor', (req, res) => {
  data = loadData();
  res.json(data.asesores);
});

app.get('/api/products', (req, res) => {
  data = loadData();
  res.json(data.products);
});

// ── Admin: Products CRUD ──

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(__dirname, 'uploads', 'productos');
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const name = Date.now() + '-' + Math.random().toString(36).slice(2, 8) + ext;
      cb(null, name);
    }
  }),
  limits: { fileSize: 50 * 1024 * 1024 }
});

app.get('/api/admin/products', (req, res) => {
  data = loadData();
  res.json(data.products);
});

app.post('/api/admin/products', express.json(), (req, res) => {
  data = loadData();
  const p = req.body;
  if (!p.id || !p.name) return res.status(400).json({ error: 'id y name son requeridos' });
  if (data.products.find(x => x.id === p.id)) return res.status(400).json({ error: 'ID ya existe' });

  const product = {
    id: p.id,
    name: p.name,
    cat: p.cat || '',
    type: p.type || 'sofa',
    price: Number(p.price) || 0,
    old: p.old ? Number(p.old) : null,
    badge: p.badge || null,
    material: p.material || '',
    city: p.city || '',
    rating: Number(p.rating) || 4.5,
    reviews: Number(p.reviews) || 0,
    tones: p.tones || ['#7E5BC4', '#D8BE8C'],
    city2: p.city2 || '2-4 días',
    dims: p.dims || '',
    weight: p.weight || '',
    warranty: p.warranty || '2 años',
    desc: p.desc || '',
    images: p.images || []
  };

  data.products.push(product);
  saveData(data);
  res.json(product);
});

app.put('/api/admin/products/:id', express.json(), (req, res) => {
  data = loadData();
  const idx = data.products.findIndex(x => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Producto no encontrado' });

  const p = req.body;
  const existing = data.products[idx];
  data.products[idx] = {
    ...existing,
    name: p.name ?? existing.name,
    cat: p.cat ?? existing.cat,
    type: p.type ?? existing.type,
    price: p.price !== undefined ? Number(p.price) : existing.price,
    old: p.old !== undefined ? (p.old ? Number(p.old) : null) : existing.old,
    badge: p.badge !== undefined ? (p.badge || null) : existing.badge,
    material: p.material ?? existing.material,
    city: p.city ?? existing.city,
    rating: p.rating !== undefined ? Number(p.rating) : existing.rating,
    reviews: p.reviews !== undefined ? Number(p.reviews) : existing.reviews,
    tones: p.tones ?? existing.tones,
    city2: p.city2 ?? existing.city2,
    dims: p.dims ?? existing.dims,
    weight: p.weight ?? existing.weight,
    warranty: p.warranty ?? existing.warranty,
    desc: p.desc ?? existing.desc,
    images: p.images ?? existing.images
  };

  saveData(data);
  res.json(data.products[idx]);
});

app.delete('/api/admin/products/:id', (req, res) => {
  data = loadData();
  const idx = data.products.findIndex(x => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Producto no encontrado' });

  data.products.splice(idx, 1);
  saveData(data);
  res.json({ ok: true });
});

app.post('/api/admin/products/:id/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió archivo' });

  data = loadData();
  const idx = data.products.findIndex(x => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Producto no encontrado' });

  const filePath = req.file.path;
  const fileBuffer = fs.readFileSync(filePath);
  const ext = path.extname(req.file.originalname).toLowerCase();
  const mimeMap = {'.png':'image/png','.webp':'image/webp','.gif':'image/gif','.jpg':'image/jpeg','.jpeg':'image/jpeg','.mp4':'video/mp4','.webm':'video/webm','.mov':'video/quicktime'};
  const mime = mimeMap[ext] || 'application/octet-stream';
  const dataUrl = 'data:' + mime + ';base64,' + fileBuffer.toString('base64');

  data.products[idx].images.push(dataUrl);
  saveData(data);

  try { fs.unlinkSync(filePath); } catch(e) {}

  res.json({ image: dataUrl, images: data.products[idx].images });
});

app.delete('/api/admin/products/:id/images/:imgIdx', (req, res) => {
  data = loadData();
  const idx = data.products.findIndex(x => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Producto no encontrado' });

  const imgIdx = parseInt(req.params.imgIdx);
  if (imgIdx < 0 || imgIdx >= data.products[idx].images.length) {
    return res.status(400).json({ error: 'Índice de imagen inválido' });
  }

  const removed = data.products[idx].images.splice(imgIdx, 1)[0];
  saveData(data);

  if (removed && !removed.startsWith('data:') && removed.startsWith('uploads/')) {
    const fullPath = path.join(__dirname, removed);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  }

  res.json({ ok: true, images: data.products[idx].images });
});


// ── Admin: Asesores CRUD ──

app.get('/api/admin/asesores', (req, res) => {
  data = loadData();
  res.json(data.asesores);
});

app.post('/api/admin/asesores', express.json(), (req, res) => {
  data = loadData();
  const { nombre, telefono } = req.body;
  if (!nombre || !telefono) return res.status(400).json({ error: 'nombre y telefono son requeridos' });

  const id = (data.asesores.length ? Math.max(...data.asesores.map(a => a.id)) : 0) + 1;
  const asesor = { id, nombre, telefono };
  data.asesores.push(asesor);
  saveData(data);
  res.json(asesor);
});

app.put('/api/admin/asesores/:id', express.json(), (req, res) => {
  data = loadData();
  const idx = data.asesores.findIndex(a => a.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Asesor no encontrado' });

  const { nombre, telefono } = req.body;
  if (nombre) data.asesores[idx].nombre = nombre;
  if (telefono) data.asesores[idx].telefono = telefono;
  saveData(data);
  res.json(data.asesores[idx]);
});

app.delete('/api/admin/asesores/:id', (req, res) => {
  data = loadData();
  const idx = data.asesores.findIndex(a => a.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Asesor no encontrado' });

  data.asesores.splice(idx, 1);
  saveData(data);
  res.json({ ok: true });
});

// ── Admin: Leads ──

app.get('/api/admin/leads', (req, res) => {
  data = loadData();
  res.json(data.leads || []);
});

app.delete('/api/admin/leads/:id', (req, res) => {
  data = loadData();
  const idx = (data.leads || []).findIndex(l => l.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Lead no encontrado' });
  data.leads.splice(idx, 1);
  saveData(data);
  res.json({ ok: true });
});

app.get('/', (req, res) => {
  res.redirect('/muebleBo.dc.html');
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor InCassa DECO corriendo en http://localhost:${PORT}`);
  console.log(`Admin: http://localhost:${PORT}/admin.html`);
  console.log(`Tienda: http://localhost:${PORT}/muebleBo.standalone-src.html`);
});

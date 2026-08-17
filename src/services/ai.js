const { GoogleGenerativeAI } = require('@google/generative-ai');

let genai = null;
function getGenAI() {
  if (!genai) genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genai;
}

async function chat(message, history, systemPrompt) {
  const model = getGenAI().getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction: systemPrompt,
  });

  // Build history for Gemini (requires alternating user/model roles, starting with user)
  const filtered = [];
  let lastRole = null;
  for (const m of history) {
    const role = m.role === 'assistant' || m.role === 'bot' ? 'model' : 'user';
    if (role === lastRole) continue; // skip consecutive same-role messages
    filtered.push({ role, parts: [{ text: m.content || m.text || '' }] });
    lastRole = role;
  }
  // Remove trailing model message (last turn must be user)
  while (filtered.length && filtered[filtered.length - 1].role === 'model') filtered.pop();

  const chatSession = model.startChat({ history: filtered });
  const result = await chatSession.sendMessage(message);
  const text = result.response.text();

  return { text, tokens: 0 };
}

module.exports = { chat };

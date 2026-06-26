const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function chat(message, history, systemPrompt) {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const geminiHistory = history.slice(0, -1).map(function(m) {
    return { role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] };
  });

  const chatSession = model.startChat({
    history: geminiHistory,
    systemInstruction: { parts: [{ text: systemPrompt }] },
  });

  const result = await chatSession.sendMessage(message);
  const text = result.response.text();

  const inputTokens = result.response.usageMetadata ? result.response.usageMetadata.promptTokenCount || 0 : 0;
  const outputTokens = result.response.usageMetadata ? result.response.usageMetadata.candidatesTokenCount || 0 : 0;

  return { text, tokens: inputTokens + outputTokens };
}

module.exports = { chat };

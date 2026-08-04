const Groq = require('groq-sdk');

let groq = null;
function getGroq() {
  if (!groq) groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return groq;
}

async function chat(message, history, systemPrompt) {
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map(function(m) {
      return { role: m.role, content: m.content };
    })
  ];

  const result = await getGroq().chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: messages,
    max_tokens: 300,
    temperature: 0.7,
  });

  const text = result.choices[0].message.content;
  const inputTokens = result.usage ? result.usage.prompt_tokens || 0 : 0;
  const outputTokens = result.usage ? result.usage.completion_tokens || 0 : 0;

  return { text, tokens: inputTokens + outputTokens };
}

module.exports = { chat };

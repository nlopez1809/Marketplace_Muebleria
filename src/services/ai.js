const Groq = require('groq-sdk');

let groq = null;
function getGroq() {
  if (!groq) groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return groq;
}

async function chat(message, history, systemPrompt) {
  // Groq requires conversation to start with 'user' after 'system'
  // Drop leading 'assistant' messages to avoid API error
  let filtered = history.map(function(m) {
    return { role: m.role, content: m.content };
  });
  while (filtered.length && filtered[0].role !== 'user') filtered.shift();

  const messages = [
    { role: 'system', content: systemPrompt },
    ...filtered,
  ];

  const result = await getGroq().chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: messages,
    max_tokens: 400,
    temperature: 0.7,
  });

  const text = result.choices[0].message.content;
  const inputTokens = result.usage ? result.usage.prompt_tokens || 0 : 0;
  const outputTokens = result.usage ? result.usage.completion_tokens || 0 : 0;

  return { text, tokens: inputTokens + outputTokens };
}

module.exports = { chat };

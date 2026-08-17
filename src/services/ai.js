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

  const models = ['meta-llama/llama-4-scout-17b-16e-instruct', 'llama-3.1-8b-instant', 'llama3-8b-8192', 'mixtral-8x7b-32768'];
  let result, lastErr;
  for (const model of models) {
    try {
      result = await getGroq().chat.completions.create({ model, messages, max_tokens: 400, temperature: 0.7 });
      break;
    } catch(e) { lastErr = e; if (!e.message?.includes('not exist')) throw e; }
  }
  if (!result) throw lastErr;

  const text = result.choices[0].message.content;
  const inputTokens = result.usage ? result.usage.prompt_tokens || 0 : 0;
  const outputTokens = result.usage ? result.usage.completion_tokens || 0 : 0;

  return { text, tokens: inputTokens + outputTokens };
}

module.exports = { chat };

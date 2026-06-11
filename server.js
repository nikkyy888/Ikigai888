const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-5';
// Proxy endpoint — AI comment per question
app.post('/api/comment', async (req, res) => {
  const { sphere, question, answer } = req.body;
  try {
    const result = await callClaude(
      `Ты — мудрый японский наставник, помогающий человеку найти его Икигай.
Человек ответил на вопрос из сферы "${sphere}":
Вопрос: "${question}"
Ответ: "${answer}"

Напиши одно короткое (1-2 предложения) тёплое наблюдение или уточняющую мысль.
Говори на русском языке, без лишних слов, с заботой.`, 150);
    res.json({ text: result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Proxy endpoint — full Ikigai analysis
app.post('/api/ikigai', async (req, res) => {
  const { qa } = req.body;
  try {
    const text = await callClaude(
      `Ты — мудрый наставник по японской философии Икигай. Проведи глубокий анализ ответов человека и сформулируй его Икигай.

ОТВЕТЫ ЧЕЛОВЕКА:
${qa}

Отвечай ТОЛЬКО валидным JSON без markdown и без пояснений:
{
  "statement": "Краткая вдохновляющая формулировка Икигай (1-2 предложения)",
  "love_insight": "2-3 предложения с конкретными наблюдениями",
  "skill_insight": "2-3 предложения",
  "world_insight": "2-3 предложения",
  "pay_insight": "2-3 предложения",
  "passion": "2-4 слова (Люблю+Хорош)",
  "mission": "2-4 слова (Люблю+Миру)",
  "vocation": "2-4 слова (Миру+Платят)",
  "profession": "2-4 слова (Платят+Хорош)",
  "hours24": ["Конкретное действие за 24 часа с деталями","Второе действие","Третье действие"],
  "days7": [
    {"day":"День 1–2","action":"Конкретное действие с деталями"},
    {"day":"День 3–4","action":"Конкретное действие"},
    {"day":"День 5–6","action":"Конкретное действие"},
    {"day":"День 7","action":"Итог недели — рефлексия или первый видимый результат"}
  ],
  "closing": "Тёплое завершающее слово от наставника — 2-3 предложения"
}`, 2000);

    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return res.status(500).json({ error: 'JSON не найден в ответе' });
    res.json(JSON.parse(match[0]));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

async function callClaude(prompt, maxTokens) {
  const res = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.content?.[0]?.text || '';
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));

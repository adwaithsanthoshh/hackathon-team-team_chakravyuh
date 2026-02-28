import 'dotenv/config';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

function isConfigured() {
    return GROQ_API_KEY && GROQ_API_KEY !== 'your_groq_api_key_here';
}

async function callGroq(messages, maxTokens = 1024) {
    if (!isConfigured()) {
        throw new Error('Groq API key not configured');
    }

    const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: MODEL,
            messages,
            max_tokens: maxTokens,
            temperature: 0.3,
        }),
    });

    if (!response.ok) {
        const err = await response.text().catch(() => 'Unknown error');
        throw new Error(`Groq API error ${response.status}: ${err}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
}

/**
 * Sort cases by AI-determined priority.
 * Returns array of { id, priority, reason } sorted high-to-low.
 */
export async function sortByPriority(cases) {
    if (!cases || cases.length === 0) return [];

    const caseSummary = cases.map((c, i) => ({
        index: i,
        id: c.id,
        name: c.name,
        camp: c.camp,
        injured: c.injured,
        injuryDescription: c.injuryDescription || '',
        trapped: c.trapped,
        trappedDescription: c.trappedDescription || '',
        familyCount: c.familyCount || 1,
        village: c.village || '',
    }));

    const prompt = `You are a disaster relief triage AI. Analyze these cases and sort them by urgency.

CASES:
${JSON.stringify(caseSummary, null, 2)}

Return ONLY a JSON array (no markdown, no explanation) with objects like:
[{"id": "...", "priority": "HIGH|MEDIUM|LOW", "reason": "brief reason"}]

Priority rules:
- HIGH: Life-threatening injuries (head injuries, fractures, bleeding), multiple trapped people, children/elderly involved
- MEDIUM: Non-critical injuries, single trapped person, moderate family size
- LOW: No injury, not trapped, basic needs only

Sort from highest to lowest priority.`;

    const content = await callGroq([{ role: 'user', content: prompt }]);

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = content.trim();
    const jsonMatch = jsonStr.match(/\[[\s\S]*\]/);
    if (jsonMatch) jsonStr = jsonMatch[0];

    return JSON.parse(jsonStr);
}

/**
 * AI chatbot — answer questions about relief data
 */
export async function chatWithContext(question, dbContext) {
    const systemPrompt = `You are a disaster relief AI assistant for ReliefLink, a Kerala flood relief system.
You have access to the following real-time data from the relief database.
Answer questions accurately based on this data. Be concise and helpful.
Use numbers and specifics from the data. Format responses clearly.

CURRENT DATABASE STATE:
${JSON.stringify(dbContext, null, 2)}`;

    const content = await callGroq([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question },
    ], 512);

    return content;
}

export { isConfigured };

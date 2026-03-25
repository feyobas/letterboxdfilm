export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/chat') {
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'Content-Type',
          }
        });
      }

      if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
      }

      const body = await request.json();
      const prompt = (body.messages || []).map(m => m.content).join('\n');

      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: body.max_tokens || 1000 }
          })
        }
      );

      const geminiData = await geminiRes.json();

      if (!geminiRes.ok || geminiData.error) {
        const msg = geminiData.error?.message || JSON.stringify(geminiData);
        return new Response(JSON.stringify({ error: { message: msg } }), {
          status: geminiRes.status,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Return in Anthropic-compatible format so frontend needs no changes
      return new Response(JSON.stringify({
        content: [{ type: 'text', text }]
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return env.ASSETS.fetch(request);
  }
}

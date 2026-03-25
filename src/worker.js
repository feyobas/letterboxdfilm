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

      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.GROQ_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          max_tokens: body.max_tokens || 1000,
          messages: body.messages || [],
        })
      });

      const groqData = await groqRes.json();

      if (!groqRes.ok || groqData.error) {
        const msg = groqData.error?.message || JSON.stringify(groqData);
        return new Response(JSON.stringify({ error: { message: msg } }), {
          status: groqRes.status,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const text = groqData.choices?.[0]?.message?.content || '';

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

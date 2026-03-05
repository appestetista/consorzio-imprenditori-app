import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const apiKey = Deno.env.get("DEEPSEEK_API_KEY");
    if (!apiKey) return Response.json({ error: 'DEEPSEEK_API_KEY non configurata' }, { status: 500 });

    console.log('[testDeepSeek] Chiave presente, lunghezza:', apiKey.length);
    console.log('[testDeepSeek] Primi 8 chars:', apiKey.substring(0, 8));

    const startTime = Date.now();
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        "Authorization": `Bearer ${apiKey}` 
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "user", content: "Rispondi solo: OK funziona" }
        ],
        temperature: 0.1,
        max_tokens: 50,
      }),
      signal: AbortSignal.timeout(30000),
    });

    const elapsed = Date.now() - startTime;
    console.log('[testDeepSeek] Status:', response.status, '| Tempo:', elapsed, 'ms');

    if (!response.ok) {
      const err = await response.text();
      console.log('[testDeepSeek] Errore body:', err);
      return Response.json({ error: `DeepSeek ${response.status}`, details: err, elapsed_ms: elapsed }, { status: 500 });
    }

    const data = await response.json();
    console.log('[testDeepSeek] Risposta OK:', JSON.stringify(data.choices?.[0]?.message?.content));

    return Response.json({ 
      success: true, 
      response: data.choices?.[0]?.message?.content,
      model: data.model,
      usage: data.usage,
      elapsed_ms: elapsed
    });
  } catch (e) {
    console.error('[testDeepSeek] Errore:', e.message);
    return Response.json({ error: e.message }, { status: 500 });
  }
});
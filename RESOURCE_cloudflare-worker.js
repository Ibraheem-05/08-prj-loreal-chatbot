// Assignment-required standalone Cloudflare Worker.
// The OpenAI API key is kept ONLY as Cloudflare encrypted secret OPENAI_API_KEY.
// The website runs on GitHub Pages; this worker is a JSON API, not an asset server.
const ALLOWED_ORIGINS = new Set([
  "https://ibraheem-05.github.io",
  "http://localhost:8788",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
]);

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowed = !origin || ALLOWED_ORIGINS.has(origin);
    const headers = {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": allowed && origin ? origin : "https://ibraheem-05.github.io",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin",
    };
    const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers });

    if (!allowed) return json({ error: "Origin not allowed." }, 403);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    // Visiting the worker directly is an API health check; no ASSETS binding is necessary.
    if (request.method === "GET") return json({ status: "ok", service: "L'Oreal beauty advisor API", method: "POST" });
    if (request.method !== "POST") return json({ error: "Use POST to send a chat message." }, 405);
    if (!env.OPENAI_API_KEY) return json({ error: "OPENAI_API_KEY is not configured in Cloudflare." }, 503);

    let input;
    try {
      const raw = await request.text();
      if (raw.length > 16000) return json({ error: "Message payload is too large." }, 413);
      input = JSON.parse(raw);
    } catch {
      return json({ error: "Request body must be valid JSON." }, 400);
    }

    const messages = input?.messages;
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 10 ||
        messages[messages.length - 1]?.role !== "user" ||
        messages.some(item => !item || !["user", "assistant"].includes(item.role) ||
          typeof item.content !== "string" || !item.content.trim() || item.content.length > 2000)) {
      return json({ error: "Send 1–10 chat messages ending with a user question." }, 400);
    }

    const instructions =
      "You are an educational chatbot focused on L'Oréal beauty products, skincare, haircare, makeup, fragrances, beauty routines, and product recommendations. " +
      "Politely refuse or redirect unrelated questions back to L'Oréal and beauty topics. " +
      "Help users build routines from their stated preferences. " +
      "Do not invent product ingredients, prices, product availability, or brand endorsements. " +
      "Avoid medical diagnoses or harmful beauty ideals. Answer clearly and briefly.";

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [{ role: "system", content: instructions }, ...messages],
          max_completion_tokens: 350,
        }),
      });

      if (!response.ok) {
        // Do not expose key details or raw provider responses to site visitors.
        if (response.status === 401 || response.status === 403)
          return json({ error: "The configured OpenAI key is invalid or lacks access." }, 502);
        if (response.status === 429)
          return json({ error: "OpenAI quota or rate limit reached. Check API billing and limits." }, 503);
        return json({ error: "OpenAI could not complete this request." }, 502);
      }

      const data = await response.json();
      if (!data?.choices?.[0]?.message?.content)
        return json({ error: "OpenAI returned an empty response." }, 502);
      // Match the starter assignment: frontend uses data.choices[0].message.content.
      return json({ choices: [{ message: { content: data.choices[0].message.content } }] });
    } catch {
      return json({ error: "The Worker could not reach OpenAI." }, 502);
    }
  },
};

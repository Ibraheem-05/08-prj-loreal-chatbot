// Deploy this file as a standalone Cloudflare Worker, not as a <script> in index.html.
// Set OPENAI_API_KEY under Worker > Settings > Variables and Secrets (type: Secret).
export default {
  async fetch(request, env) {
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    };

    const json = (body, status = 200) =>
      new Response(JSON.stringify(body), { status, headers });

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }
    if (request.method !== "POST") {
      return json({ error: "Use POST to send a chat message." }, 405);
    }
    if (!env.OPENAI_API_KEY) {
      return json({ error: "The Cloudflare Worker is missing OPENAI_API_KEY." }, 503);
    }

    let input;
    try {
      const raw = await request.text();
      if (raw.length > 16000) {
        return json({ error: "Request is too large." }, 413);
      }
      input = JSON.parse(raw);
    } catch {
      return json({ error: "Invalid JSON request." }, 400);
    }

    const messages = input?.messages;
    if (
      !Array.isArray(messages) ||
      !messages.length ||
      messages.length > 10 ||
      messages.at(-1)?.role !== "user" ||
      messages.some(message =>
        !message ||
        !["user", "assistant"].includes(message.role) ||
        typeof message.content !== "string" ||
        !message.content.trim() ||
        message.content.length > 2000
      )
    ) {
      return json({ error: "Send 1–10 valid chat messages ending with a user message." }, 400);
    }

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "You are a L'Oréal-focused student demo beauty advisor. " +
                "Only answer questions about L'Oréal products, skincare, haircare, " +
                "makeup, fragrances, and related beauty routines or recommendations. " +
                "Politely redirect unrelated questions to those topics. " +
                "Do not invent product facts, pricing or availability."
            },
            ...messages
          ],
          max_completion_tokens: 300
        })
      });

      const data = await response.json();
      if (!response.ok) {
        return json({
          error: response.status === 429
            ? "OpenAI API rate limit or quota reached."
            : response.status === 401 || response.status === 403
              ? "OpenAI key is invalid or lacks permission."
              : "OpenAI API returned an error."
        }, response.status);
      }
      // Preserve the assignment starter's Chat Completions response shape.
      return json(data);
    } catch {
      return json({ error: "Cloudflare Worker could not reach OpenAI." }, 502);
    }
  }
};

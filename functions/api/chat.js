// Cloudflare Pages Function: POST /api/chat
// OPENAI_API_KEY must be configured as a Cloudflare secret (never in browser code).
const json = (value, status = 200) =>
  Response.json(value, {
    status,
    headers: { "Cache-Control": "no-store" },
  });

const SYSTEM_PROMPT =
  "You are a helpful beauty product advisor for a L'Oréal-themed student demo. " +
  "Help users explore skincare, haircare, makeup, and fragrances, and suggest " +
  "simple routines based on their preferences. Do not imply official endorsement " +
  "by L'Oréal or invent product specifications, prices, stock, or verified results. " +
  "Ask clarifying questions when needed and avoid medical diagnoses.";

export async function onRequestPost({ request, env }) {
  if (!env.OPENAI_API_KEY) {
    return json({ error: "The server's OpenAI API key has not been configured." }, 503);
  }

  if (!(request.headers.get("content-type") || "").includes("application/json")) {
    return json({ error: "Send JSON with a messages array." }, 415);
  }

  const length = Number(request.headers.get("content-length") || "0");
  if (length > 16000) {
    return json({ error: "Your message is too long." }, 413);
  }

  let payload;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > 16000) {
      return json({ error: "Your message is too long." }, 413);
    }
    payload = JSON.parse(raw);
  } catch {
    return json({ error: "Invalid JSON request." }, 400);
  }

  const submitted = payload && payload.messages;
  if (!Array.isArray(submitted) || !submitted.length || submitted.length > 10) {
    return json({ error: "Send between 1 and 10 chat messages." }, 400);
  }

  const messages = submitted.map((entry) => ({
    role: entry && entry.role,
    content: entry && entry.content,
  }));

  if (
    messages.some(
      (m) =>
        !["user", "assistant"].includes(m.role) ||
        typeof m.content !== "string" ||
        !m.content.trim() ||
        m.content.length > 2000
    ) ||
    messages[messages.length - 1].role !== "user"
  ) {
    return json({ error: "Invalid chat messages." }, 400);
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + env.OPENAI_API_KEY,
      },
      body: JSON.stringify({
        model: "gpt-6-luna",
        reasoning_effort: "none",
        max_completion_tokens: 450,
        messages: [{ role: "developer", content: SYSTEM_PROMPT }, ...messages],
      }),
      signal: AbortSignal.timeout(25000),
    });

    if (!response.ok) {
      // Avoid exposing provider details or credentials to site visitors.
      if (response.status === 401 || response.status === 403) {
        return json({ error: "The AI service credentials need attention." }, 502);
      }
      if (response.status === 429) {
        return json({ error: "The AI service has reached a limit. Try again later." }, 503);
      }
      return json({ error: "The AI service could not respond." }, 502);
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content;
    if (typeof reply !== "string" || !reply.trim()) {
      return json({ error: "The AI service returned no answer." }, 502);
    }

    return json({ reply: reply.trim() });
  } catch {
    return json({ error: "Could not reach the AI service. Try again." }, 502);
  }
}

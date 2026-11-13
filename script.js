// Browser-side chat UI. The OpenAI key stays on the server.
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const sendBtn = document.getElementById("sendBtn");

// GitHub Pages needs the URL of a deployed Cloudflare Worker, e.g.
// https://your-worker.your-account.workers.dev
// Leave blank only when using a Cloudflare Pages site with /api/chat.
const workerUrl = "";

const conversation = [];
chatWindow.replaceChildren();

function addMessage(role, content) {
  const message = document.createElement("div");
  message.className = "msg " + role;

  const label = document.createElement("strong");
  label.className = "msg-label";
  label.textContent = role === "user" ? "You: " : role === "error" ? "Error: " : "Advisor: ";

  const body = document.createElement("span");
  body.textContent = content; // Never interpret model/user text as HTML.

  message.append(label, body);
  chatWindow.appendChild(message);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return message;
}

addMessage("ai", "Hi! Ask me about skincare, makeup, haircare, fragrances, or beauty routines.");

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const prompt = userInput.value.trim();

  if (!prompt || sendBtn.disabled) return;

  const userMessage = { role: "user", content: prompt };
  conversation.push(userMessage);
  addMessage("user", prompt);

  userInput.value = "";
  userInput.disabled = true;
  sendBtn.disabled = true;
  const waiting = addMessage("ai", "Thinking…");

  try {
    if (location.hostname.endsWith(".github.io") && !workerUrl) {
      throw new Error("Cloudflare Worker URL is not configured. Deploy RESOURCE_cloudflare-worker.js and paste the workers.dev URL into workerUrl in script.js.");
    }
    const endpoint = workerUrl.trim() || "/api/chat";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: conversation.slice(-10) }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "The chat service could not respond.");
    }
    // Cloudflare Workers (assignment starter) return choices[0].message.content;
    // our optional Cloudflare Pages Function returns { reply }.
    const reply = data.reply ?? data.choices?.[0]?.message?.content;
    if (typeof reply !== "string" || !reply.trim()) {
      throw new Error(data.error?.message || data.error || "The chat service returned an empty reply.");
    }

    waiting.remove();
    addMessage("ai", reply);
    conversation.push({ role: "assistant", content: reply });
  } catch (error) {
    waiting.remove();
    conversation.pop(); // Permit retrying a failed message.
    addMessage("error", error.message || "Something went wrong.");
  } finally {
    userInput.disabled = false;
    sendBtn.disabled = false;
    userInput.focus();
  }
});

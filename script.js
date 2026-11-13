// Browser-side chat UI. The OpenAI key stays on the server.
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const sendBtn = document.getElementById("sendBtn");

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
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: conversation.slice(-10) }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "The chat service could not respond.");
    }
    if (typeof data.reply !== "string" || !data.reply.trim()) {
      throw new Error("The chat service returned an empty reply.");
    }

    waiting.remove();
    addMessage("ai", data.reply);
    conversation.push({ role: "assistant", content: data.reply });
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

// L'Oréal student chatbot. Never place an API key in this browser file.
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const sendBtn = document.getElementById("sendBtn");
const clearBtn = document.getElementById("clearBtn");
const latestExchange = document.getElementById("latestExchange");
const latestQuestion = document.getElementById("latestQuestion");
const latestAnswer = document.getElementById("latestAnswer");

// Worker handles the OpenAI secret and forwards chat requests securely.
const workerUrl = "https://08-prj-loreal-chatbot.hq3717.workers.dev";
const conversation = []; // LevelUp: preserve context across questions.
let busy = false;

function addMessage(role, content) {
  const message = document.createElement("div");
  message.className = "msg " + role;

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  const label = document.createElement("span");
  label.className = "msg-label";
  label.textContent = role === "user" ? "You" : role === "error" ? "Connection error" : "Beauty Advisor";
  const body = document.createElement("span");
  body.className = "msg-body";
  body.textContent = content; // textContent avoids injecting user/model HTML.

  bubble.append(label, body);
  message.appendChild(bubble);
  chatWindow.appendChild(message);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return message;
}

function resetChat() {
  conversation.length = 0;
  chatWindow.replaceChildren();
  latestExchange.hidden = true;
  latestQuestion.textContent = "";
  latestAnswer.textContent = "";
  addMessage("ai", "Hello! Ask me about L'Oréal skincare, haircare, makeup, fragrances, or beauty routines.");
}

function setBusy(value) {
  busy = value;
  userInput.disabled = value;
  sendBtn.disabled = value;
  clearBtn.disabled = value;
  sendBtn.textContent = value ? "…" : "Send";
}

clearBtn.addEventListener("click", resetChat);
resetChat();

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const prompt = userInput.value.trim();
  if (!prompt || busy) return;

  // LevelUp: show latest user question directly above this answer, reset each turn.
  latestExchange.hidden = false;
  latestQuestion.textContent = prompt;
  latestAnswer.textContent = "Thinking…";

  conversation.push({ role: "user", content: prompt });
  addMessage("user", prompt);
  userInput.value = "";
  setBusy(true);
  const waiting = addMessage("ai", "Thinking…");

  try {
    const response = await fetch(workerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: conversation.slice(-10) }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const details = typeof data.error === "string" ? data.error : data.error?.message;
      throw new Error(details || "The chatbot could not reach the AI service.");
    }
    const reply = data.reply ?? data.choices?.[0]?.message?.content;
    if (typeof reply !== "string" || !reply.trim()) {
      throw new Error("No chatbot reply was returned. Please try again.");
    }

    waiting.remove();
    addMessage("ai", reply);
    latestAnswer.textContent = reply;
    conversation.push({ role: "assistant", content: reply });
  } catch (error) {
    waiting.remove();
    conversation.pop(); // Failed messages should not pollute the next request.
    const details = error instanceof Error ? error.message : "Unable to connect.";
    addMessage("error", details);
    latestAnswer.textContent = details;
  } finally {
    setBusy(false);
    userInput.focus();
  }
});

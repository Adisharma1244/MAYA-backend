
const input = document.getElementById("input");
const chat = document.getElementById("chat");
const welcome = document.getElementById("welcome");

// Add message to UI
function addMessage(text, sender) {

  // remove welcome screen
  if (welcome) {
    welcome.remove();
  }

  const msg = document.createElement("div");
  msg.classList.add("message", sender);

  msg.innerText = text;

  chat.appendChild(msg);

 
  chat.scrollTop = chat.scrollHeight;
}


async function sendMessage() {
  const userText = input.value.trim();
  if (!userText) return;

  addMessage(userText, "user");
  input.value = "";

  try {
    const response = await fetch("https://web-production-50ca.up.railway.app/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: "1",
        message: userText
      }),
    });

    const data = await response.json();
    console.log("API RESPONSE:", data);

    // FIX for undefined
    let reply = "No response";
    if (typeof data === "string") {
      reply = data;
    } else if (data.reply) {
      reply = data.reply;
    } else if (data.response) {
      reply = data.response;
    } else if (data.message) {
      reply = data.message;
    } else if (data.choices) {
      reply = data.choices[0]?.message?.content;
    }

    addMessage(reply, "bot");

  } catch (error) {
    console.error(error);
    addMessage("Server error ", "bot");
  }
}

// Enter key support
input.addEventListener("keypress", function(e) {
  if (e.key === "Enter") {
    sendMessage();
  }
});
const axios = require('axios');

module.exports.config = {
  name: "ask",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "ConvertedForMessenger",
  description: "Ask the AI anything",
  commandCategory: "system",
  usages: "question",
  usePrefix: true,
  cooldowns: 15,
  envConfig: {
    autoUnsend: false,
    delayUnsend: 300
  }
};

module.exports.languages = {
  "en": {
    "maxLengthError": "❌ Please keep your question under 300 characters.",
    "missingQuestion": "❌ Please provide a question after the command.",
    "apiKeyError": "⚠️ Together API key is not set.",
    "unexpectedError": "⚠️ An unexpected error occurred.",
    "cooldownMessage": "⏳ Slow down! Try again in {time} seconds.",
    "answerTemplate": "🗣️ Arcadia Says:\n\n✨ {answer}",
    "moduleInfo": (
      "─────[ %1 ]──────\n\n" +
      "Usage: %3\nCategory: %4\nCooldown: %5 seconds\nPermission: %6\nDescription: %2\n\n" +
      "Module coded by %7"
    )
  }
};

const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY || ""; // Set your API key in environment

async function queryTogetherAI(prompt) {
  if (!TOGETHER_API_KEY) throw new Error("API key missing");

  const headers = {
    "Authorization": `Bearer ${TOGETHER_API_KEY}`,
    "Content-Type": "application/json"
  };
  const data = {
    model: "mistralai/Mixtral-8x7B-Instruct-v0.1",
    messages: [
      { role: "system", content: "You are a helpful and friendly assistant." },
      { role: "user", content: prompt }
    ],
    max_tokens: 300,
    temperature: 0.7
  };

  const response = await axios.post("https://api.together.xyz/v1/chat/completions", data, { headers });
  if (response.status === 200 && response.data.choices && response.data.choices[0]) {
    return response.data.choices[0].message.content.trim();
  } else {
    throw new Error(`API Error: ${response.status} — ${response.statusText}`);
  }
}

module.exports.handleEvent = async function ({ api, event, getText }) {
  // You can optionally handle passive listening or trigger on specific keywords
  // For example, if you want react on message body starting with 'ask'
  const body = event.body || "";
  if (!body.toLowerCase().startsWith("ask")) return;

  let args = body.trim().split(/\s+/).slice(1);
  if (args.length === 0) return;  // no question given
  await this.run({ api, event, args, getText });
};

module.exports.run = async function({ api, event, args, getText }) {
  const threadID = event.threadID;
  const messageID = event.messageID;

  const question = args.join(" ");
  if (!TOGETHER_API_KEY) {
    return api.sendMessage(getText("apiKeyError"), threadID, messageID);
  }

  if (!question) {
    return api.sendMessage(getText("missingQuestion"), threadID, messageID);
  }

  if (question.length > 300) {
    return api.sendMessage(getText("maxLengthError"), threadID, messageID);
  }

  try {
    // Optional: show a 'typing...' indicator if your API supports it

    const answer = await queryTogetherAI(question);
    const responseText = getText("answerTemplate").replace("{answer}", answer);

    return api.sendMessage(responseText, threadID, messageID);
  } catch (error) {
    return api.sendMessage(getText("unexpectedError") + "\n" + error.message, threadID, messageID);
  }
};

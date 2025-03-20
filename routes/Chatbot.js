const express = require("express");
const axios = require("axios");
const dotenv = require("dotenv");
const User = require("../models/User"); // Import User model
const auth = require("../middleware/auth"); // Import auth middleware

dotenv.config();
const router = express.Router();

router.post("/", auth, async (req, res) => {
  const { message, roadmapTitle, roadmapData } = req.body;
  const userId = req.user.id;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    const usageInfo = user.checkChatbotUsage();
    if (!usageInfo.canUse) {
      return res.status(403).json({
        reply:
          "🚫 Daily chatbot limit reached (10 prompts). Try again tomorrow.",
        usageCount: usageInfo.usageCount,
        remainingCount: 0,
      });
    }

    // If the user can still send messages, increment the usage count
    await user.incrementChatbotUsage();
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              {
                text: `Roadmap: ${roadmapTitle}
Roadmap Content: ${roadmapData}
User Query: ${message}

Instructions:
1. Answer the user's query based on the roadmap information provided.
2. Format your response with clear structure:
   - Use numbered lists (1., 2., 3.) for sequential steps or processes
   - Use bullet points (*, -, •) for non-sequential items
   - Use paragraphs with blank lines between them for separate thoughts
   - Use ** or __ for bold text to emphasize important points
   - Structure your response with proper spacing for readability
3. Keep responses concise but informative.`,
              },
            ],
          },
        ],
      }
    );

    const reply =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "I couldn't find an answer.";

    res.json({
      reply,
      usageCount: usageInfo.usageCount + 1,
      remainingCount: usageInfo.remainingCount - 1,
    });
  } catch (error) {
    console.error("Chatbot API error:", error?.response?.data || error.message);
    res.status(500).json({ reply: "Sorry, I couldn't process that request." });
  }
});
router.get("/usage", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: "User not found" });

    const usageInfo = user.checkChatbotUsage();
    res.json({
      usageCount: usageInfo.usageCount,
      remainingCount: usageInfo.remainingCount,
    });
  } catch (error) {
    console.error("Error fetching chatbot usage:", error);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;

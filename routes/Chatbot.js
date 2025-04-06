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
    2. Format your response with proper structure and formatting:
       - Use markdown-style headers (# Header, ## Subheader)
       - Use code blocks with syntax highlighting for code examples: \`\`\`language
         code here
         \`\`\`
       - Use inline code with backticks for short code snippets, variables, or commands
       - Use numbered lists (1., 2., 3.) for sequential steps or processes
       - Use bullet points (*, -, •) for non-sequential items
       - Use paragraphs with blank lines between them for separate thoughts
       - Use bold text (**bold**) for important concepts and key terms
       - Use tables to present structured data or comparisons
       - Use callout boxes for warnings, tips, and important information:
         > ⚠️ Warning information here
         > 💡 Tip information here
         > 📌 Important information here
       - Include relevant resources as [Resource](URL) when applicable
       - Provide code examples when they would be helpful
    
    3. Make sure your response is well-structured and organized, with appropriate spacing between sections
    4. Keep responses concise but informative
    5. Prioritize practical information and executable examples over theoretical explanations
    6. When answering technical questions, include code examples where relevant`,
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

const express = require("express");
const axios = require("axios");
const dotenv = require("dotenv");

dotenv.config();
const router = express.Router();

router.post("/", async (req, res) => {
  const { message, roadmapTitle, roadmapData } = req.body;

  try {
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

    res.json({ reply });
  } catch (error) {
    console.error("Chatbot API error:", error?.response?.data || error.message);
    res.status(500).json({ reply: "Sorry, I couldn't process that request." });
  }
});

module.exports = router;

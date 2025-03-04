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
                text: `Roadmap: ${roadmapTitle}\nRoadmap Content: ${roadmapData}\nUser Query: ${message}`,
              },
            ],
          },
        ],
      }
    );

    // Extract response
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

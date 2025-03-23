const express = require("express");
const axios = require("axios");
const dotenv = require("dotenv");
const auth = require("../../middleware/auth"); // Import auth middleware
const User = require("../../models/User"); // Import User model

dotenv.config();
const router = express.Router();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// Get user's roadmap usage
router.get("/usage", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    const usageInfo = user.checkRoadmapUsage();
    res.json(usageInfo);
  } catch (error) {
    console.error("Error getting usage:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

// Generate roadmap with limit enforcement
router.post("/generate", auth, async (req, res) => {
  const { input } = req.body;

  if (!input) {
    return res.status(400).json({ error: "Input is required" });
  }

  try {
    // Get user and check usage
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    const usageInfo = user.checkRoadmapUsage();

    if (!usageInfo.canGenerate) {
      return res.status(403).json({
        error: "Daily limit reached",
        usageCount: usageInfo.usageCount,
        remainingCount: 0,
      });
    }

    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: `Generate a detailed learning roadmap covering all topics and skills in a separate step for ${input} in hierarchical JSON format with the following simplified structure:
              {
  "name": "[TOPIC] Learning Roadmap 2025",
  "children": [
    {
      "name": "Main Category 1",
      "children": [
        {
          "name": "Subcategory 1.1",
        },
        {
          "name": "Subcategory 1.2",
        }
      ]
    }
  ]
}

Requirements:

Structure must have exactly 3 levels of hierarchy (no nested children beyond subcategories):
- Level 1: Root node (the roadmap itself)
- Level 2: Main categories (fundamental areas of knowledge)
- Level 3: Subcategories (specific topics within each area)

Node limits:
- Root node should have as many main categories as required for a comprehensive learning map
- You can add as many main categories as needed(try to extend the list of main categories as needed)
- Each main category should have 3-8 subcategories as children
- Subcategories are leaf nodes (no children)

Naming guidelines:
- Use clear, concise names (1-4 words) for all nodes
- Main categories should represent broad knowledge areas
- Subcategories should represent focused topics that encompass several related skills

Content focus:
- Ensure the roadmap reflects current industry standards and practices for 2025
- Include specific guidance, tools, technologies, and methodologies relevant to ${input}
- Structure the content so a complete beginner can follow the roadmap without needing additional hierarchical levels
- Do not generate descriptions, provide only names of topics and subtopics
- Do not try to add many topics in one step, try to give each topic a separate step 

Output format:
- Return valid JSON only
- Do not include markdown formatting or code blocks
- Ensure proper nesting and JSON syntax

Create a detailed, logical learning path that someone could follow step-by-step to learn ${input}, with all necessary details contained within the first-level children's descriptions.`,
            },
          ],
        },
      ],
    };

    const response = await axios.post(GEMINI_API_URL, requestBody, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    let generatedText =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      throw new Error("Invalid response from Gemini API");
    }

    generatedText = generatedText
      .replace(/```json|```/g, "")
      .replace(/\[\d+\]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    let generatedData;
    try {
      generatedData = JSON.parse(generatedText);
    } catch (jsonError) {
      console.error("Raw response before parsing:", generatedText);
      throw new Error(`Invalid JSON response: ${generatedText}`);
    }

    // Increment usage counter
    await user.incrementRoadmapUsage();
    const updatedUsageInfo = user.checkRoadmapUsage();

    res.json({
      roadmap: generatedData,
      usageInfo: updatedUsageInfo,
    });
  } catch (error) {
    console.error("Error generating roadmap:", error.message);
    res
      .status(500)
      .json({ error: error.message || "Failed to generate roadmap" });
  }
});

module.exports = router;

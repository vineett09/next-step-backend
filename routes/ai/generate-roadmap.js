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
              text: `Generate a long detailed learning roadmap containing at least 10 main categories or more for ${input} in hierarchical JSON format with the following structure:
{
  "name": "${input} ",
  "children": [
    {
      "name": "Main Category 1",
      "children": [
        {
          "name": "Subcategory 1.1",
          "children": [
            {
              "name": "Topic 1.1.1"
            },
            {
              "name": "Topic 1.1.2"
            }
          ]
        },
        {
          "name": "Subcategory 1.2",
          "children": [
            {
              "name": "Topic 1.2.1"
            }
          ]
        }
      ]
    }
  ]
}

Requirements:

1. Structure must follow exactly 3 levels of hierarchy:
   - Level 1: Main categories (fundamental areas of knowledge)
   - Level 2: Subcategories (specific topics within each area)
   - Level 3: Individual topics (specific skills, tools, or concepts)

2. Each main category should represent a distinct step in the learning journey
   - Organize main categories in logical progression order
   - Include only one main category per step
   - Avoid combining multiple main categories into a single step
   - Create separate steps for each main category for better user understanding
   - Try to avoid too many subcategories in a single main category
   - Organize to create maincategories for every topic in a separate single step

3. Include comprehensive content:
   - Cover all essential topics, tools, frameworks, and concepts required to learn ${input}
   - Include current industry-relevant technologies and practices for 2025

4. Naming and format:
   - Use clear, concise names (1-5 words) for all nodes
   - Do not provide long names for nodes
   - Do NOT include descriptions for any nodes
   - Do NOT include any "preferred: true" or similar flags
   - Only include the "name" field for each node

5. Output format:
   - Return valid JSON only
   - Include only the hierarchical structure with names
   - Ensure proper nesting and JSON syntax

Create a complete learning roadmap that covers all necessary knowledge areas for ${input} to the end, organized in a logical progression from beginner to advanced levels.`,
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

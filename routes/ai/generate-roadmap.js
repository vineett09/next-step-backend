const express = require("express");
const axios = require("axios");
const dotenv = require("dotenv");
const auth = require("../../middleware/auth");
const User = require("../../models/User");

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

// Get all AI-generated roadmaps for the user
router.get("/generated-roadmaps", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("aiGeneratedRoadmaps");
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }
    res.json({ aiGeneratedRoadmaps: user.aiGeneratedRoadmaps });
  } catch (error) {
    console.error("Error fetching AI-generated roadmaps:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

// Get specific AI-generated roadmap by ID
router.get("/generated-roadmaps/:id", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("aiGeneratedRoadmaps");
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    const roadmap = user.aiGeneratedRoadmaps.id(req.params.id);
    if (!roadmap) {
      return res.status(404).json({ msg: "Roadmap not found" });
    }

    res.json({ roadmap });
  } catch (error) {
    console.error("Error fetching AI-generated roadmap:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});
// Delete an AI-generated roadmap by ID
router.delete("/generated-roadmaps/:id", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Find the roadmap by ID and remove it
    const roadmapIndex = user.aiGeneratedRoadmaps.findIndex(
      (roadmap) => roadmap._id.toString() === req.params.id
    );

    if (roadmapIndex === -1) {
      return res.status(404).json({ msg: "Roadmap not found" });
    }

    user.aiGeneratedRoadmaps.splice(roadmapIndex, 1);
    await user.save();

    res.json({ msg: "Roadmap deleted successfully" });
  } catch (error) {
    console.error("Error deleting roadmap:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

// Generate roadmap with limit enforcement
router.post("/generate", auth, async (req, res) => {
  const { input, timeframe, level, contextInfo } = req.body;

  if (!input || !timeframe || !level) {
    return res
      .status(400)
      .json({ error: "Input, timeframe, and level are required" });
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
              text: `Generate a long detailed learning roadmap containing at least 10 main categories or more, Try to provide the roadmap which is built to cover the timeframe of ${timeframe} to learn at the ${level} level and make it more efficient by taking the context into account "${
                contextInfo || "No additional context"
              }". The roadmap should be in hierarchical JSON format with the following structure:
              
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
   - Avoid combining multiple topics in same main category or subcategory for better user understanding

3. Include comprehensive content:
   - Cover all essential topics, tools, frameworks, and concepts required to learn ${input} in ${timeframe} to the ${level} level
   - Include current industry-relevant technologies and practices for 2025

4. Naming and format:
   - Use clear, concise names (1-3 words) for all nodes
   - Do not provide long names for nodes
   - Do NOT include descriptions for any nodes
- For each main category (Level 1), include an additional "timeframe" field that shows how much time to spend on that step in days/weeks/months
- Do NOT include "timeframe" in subcategories or individual topics, only on Level 1 nodes

5. Output format:
   - Return valid JSON only
   - Include only the hierarchical structure with names
   - Ensure proper nesting and JSON syntax

Create a complete learning roadmap that covers all necessary knowledge areas for ${input} to the end of ${timeframe} to learn at ${level} level and an additional context of "${
                contextInfo || "No additional context"
              }" provided by the user, organized in a logical progression to learn`,
            },
          ],
        },
      ],
    };
    const feedbackRequestBody = {
      contents: [
        {
          parts: [
            {
              text: `The user has chosen the topic: "${input}" to learn at "${level}" level and timeframe "${timeframe}". They also added:
    "${contextInfo || "No additional context"}".
    
    Please provide a short helpful note or feedback to the user in one paragraph including:
    - Whether their goal and level align well with the timeframe
    - Any potential improvements in how they structured their query
    - Suggestions for better outcomes, learning tips, better time commitment or extra tools to consider
    - Don't include any extra symbols or formatting, just plain text
    Limit response to 6-7 sentences. Be direct, clear, and supportive.`,
            },
          ],
        },
      ],
    };

    const feedbackResponse = await axios.post(
      GEMINI_API_URL,
      feedbackRequestBody,
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    const aiFeedbackText =
      feedbackResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

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

    // Save the roadmap to the user's aiGeneratedRoadmaps
    const roadmapEntry = {
      roadmap: generatedData,
      title: input,
    };

    user.aiGeneratedRoadmaps.push(roadmapEntry);

    // Increment usage counter
    await user.incrementRoadmapUsage();
    await user.save();

    // Get the ID of the newly created roadmap
    const newRoadmapId =
      user.aiGeneratedRoadmaps[user.aiGeneratedRoadmaps.length - 1]._id;

    const updatedUsageInfo = user.checkRoadmapUsage();

    res.json({
      roadmap: generatedData,
      roadmapId: newRoadmapId,
      usageInfo: updatedUsageInfo,
      aiFeedback: aiFeedbackText,
    });
  } catch (error) {
    console.error("Error generating roadmap:", error.message);
    res
      .status(500)
      .json({ error: error.message || "Failed to generate roadmap" });
  }
});

module.exports = router;

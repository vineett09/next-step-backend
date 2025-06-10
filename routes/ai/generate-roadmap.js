const express = require("express");
const axios = require("axios");
const dotenv = require("dotenv");
const auth = require("../../middleware/auth");
const User = require("../../models/User");
const crypto = require("crypto");

dotenv.config();
const router = express.Router();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

// Helper function to add unique IDs to each node in the roadmap
const addUniqueIds = (node) => {
  if (!node) return;
  // Assign a unique ID to the current node
  node.id = crypto.randomUUID();
  // Recursively call the function for all children
  if (node.children) {
    node.children.forEach(addUniqueIds);
  }
};

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

    const roadmapIdToDelete = req.params.id;

    // Find the roadmap by ID and remove it from aiGeneratedRoadmaps
    const roadmapIndex = user.aiGeneratedRoadmaps.findIndex(
      (roadmap) => roadmap._id.toString() === roadmapIdToDelete
    );

    if (roadmapIndex === -1) {
      return res.status(404).json({ msg: "Roadmap not found" });
    }

    user.aiGeneratedRoadmaps.splice(roadmapIndex, 1);

    // Also remove the associated progress data from roadmapProgress
    const progressIndex = user.roadmapProgress.findIndex(
      (progress) => progress.roadmapId === roadmapIdToDelete
    );

    if (progressIndex > -1) {
      user.roadmapProgress.splice(progressIndex, 1);
    }

    await user.save();

    res.json({ msg: "Roadmap and its progress deleted successfully" });
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
              text: `Generate a long detailed learning roadmap for "${input}", Try to provide the roadmap which is built to cover the timeframe of ${timeframe} to learn at the ${level} level and make it more efficient by taking the context into account "${
                contextInfo || "No additional context"
              }". The roadmap should be in hierarchical JSON format with the following structure:
              
{
  "name": "Short Name of the ${input} based on query(2-3 words)",
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
      // Add as many main categories as needed for natural learning progression (minimum 10)
  ]
}

Requirements:

1. Structure must follow exactly 3 levels of hierarchy:
   - Level 1: Main categories (fundamental areas of knowledge)
   - Level 2: Subcategories (specific topics within each area)
   - Level 3: Individual topics (specific skills, tools, or concepts)

2. Each main category should represent a distinct step in the learning journey
   - Contain AT LEAST 10 main categories (Level 1 nodes), but FEEL FREE TO ADD MORE if appropriate for natural learning progression
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
      addUniqueIds(generatedData);
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
    });
  } catch (error) {
    console.error("Error generating roadmap:", error.message);
    res
      .status(500)
      .json({ error: error.message || "Failed to generate roadmap" });
  }
});
// Regenerate roadmap with modifications
router.post("/regenerate", auth, async (req, res) => {
  const {
    originalTopic,
    timeframe,
    level,
    contextInfo,
    modifications,
    originalRoadmap,
  } = req.body;

  if (!originalTopic || !timeframe || !level || !modifications) {
    return res.status(400).json({
      error: "Original topic, timeframe, level, and modifications are required",
    });
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
              text: `You are going to regenerate and provide a more enhanced learning roadmap based on user feedback. 
    
    ORIGINAL ROADMAP INFORMATION:
    - Topic: "${originalTopic}"
    - Timeframe: ${timeframe}
    - Level: ${level}
    - Context: "${contextInfo || "No additional context"}"
    
    USER REQUESTED MODIFICATIONS:
    "${modifications}"
    
    ORIGINAL ROADMAP STRUCTURE (JSON):
    ${JSON.stringify(originalRoadmap, null, 2)}
    
    Based on the user's modification request, generate an improved version of the roadmap.
    The regenerated roadmap MUST:
    1. Incorporate the specific changes requested by the user
    2. Contain AT LEAST 10 main categories (Level 1 nodes), but FEEL FREE TO ADD MORE if appropriate for natural learning progression
    3. Maintain THREE LEVELS of hierarchy exactly as in the original
    4. Present a coherent learning progression from beginning to end
    5. Keep all node names EXTREMELY SHORT (1-3 words maximum)
    
    Generate a NEW roadmap in hierarchical JSON format with the following structure:
    {
      "name": "Short Name of the topic based on query(2-3 words)", // Keep this EXACTLY as provided here
      "children": [
        {
          "name": "Short Name", // MAXIMUM 3 words
          "timeframe": "X weeks/days",
          "children": [
            {
              "name": "Short Name", // MAXIMUM 3 words
              "children": [
                {
                  "name": "Short Name" // MAXIMUM 3 words
                },
                {
                  "name": "Short Name" // MAXIMUM 3 words
                }
              ]
            }
          ]
        }
        // Add as many main categories as needed for natural learning progression (minimum 10)
      ]
    }
    
    STRICT REQUIREMENTS:
    1. Structure MUST follow EXACTLY 3 levels of hierarchy:
       - Root node with exact original topic name: "${originalTopic}"
       - Level 1: Main categories (fundamental areas) - MINIMUM 10 categories, but ADD MORE if needed for complete learning journey
       - Level 2: Subcategories (specific topics within each area)
       - Level 3: Individual topics (specific skills, tools, or concepts)
    2. EVERY node name MUST be 1-3 words MAXIMUM, extremely concise
    3. Each main category MUST represent a distinct step in the learning journey
    4. Include "timeframe" field ONLY for main categories (Level 1 nodes)
    5. Create a natural learning progression with comprehensive coverage of all necessary topics
    6. Return valid JSON only - ensure proper syntax
    7. Do NOT use adjectives or extra words in node names - be extremely concise
    
    Create a complete improved learning roadmap that addresses the user's modification requests while maintaining these strict formatting requirements. The roadmap should represent a natural learning journey that may require more than 10 steps - don't artificially limit yourself to exactly 10 steps.`,
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
      addUniqueIds(generatedData);
    } catch (jsonError) {
      console.error("Raw response before parsing:", generatedText);
      throw new Error(`Invalid JSON response: ${generatedText}`);
    }

    // Save the regenerated roadmap to the user's aiGeneratedRoadmaps
    const roadmapEntry = {
      roadmap: generatedData,
      title: `${originalTopic} (Modified)`,
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
    });
  } catch (error) {
    console.error("Error regenerating roadmap:", error.message);
    res
      .status(500)
      .json({ error: error.message || "Failed to regenerate roadmap" });
  }
});
module.exports = router;

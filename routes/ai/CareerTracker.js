const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const User = require("../../models/User");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const dotenv = require("dotenv");
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// POST /api/career-track/simulate
// Generate a career progression path based on user inputs
router.post("/simulate", auth, async (req, res) => {
  try {
    const payload = req.body;
    if (!payload.currentSkills || payload.currentSkills.length === 0) {
      return res.status(400).json({ error: "At least one skill is required" });
    }
    if (!payload.careerGoal) {
      return res.status(400).json({ error: "Career goal is required" });
    }
    if (!payload.careerStage) {
      return res.status(400).json({ error: "Career stage is required" });
    }
    if (!payload.educationLevel) {
      return res.status(400).json({ error: "Education level is required" });
    }

    // Get user from auth middleware
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check career track usage limit
    const usage = user.checkCareerTrackUsage();
    if (!usage.canUse) {
      return res.status(429).json({
        error: "Daily career track usage limit reached",
        remainingCount: usage.remainingCount,
      });
    }

    // Prepare the prompt for Gemini with all input fields dynamically included
    const userDetails = Object.entries(payload)
      .map(([key, value]) => {
        const formattedValue = Array.isArray(value)
          ? value.join(", ")
          : value || "N/A";
        const formattedKey = key
          .replace(/([A-Z])/g, " $1")
          .replace(/^./, (str) => str.toUpperCase())
          .trim();
        return `- ${formattedKey}: ${formattedValue}`;
      })
      .join("\n");

    const prompt = `
      You are a career coaching AI specialized in tech career progression paths. Create a career progression timeline for someone with these characteristics:
      
      User details:
      ${userDetails}
      
      I need you to generate a structured JSON response showing a realistic career path from their current position to their goal. 
      Each step should show:
      1. The job title they can achieve
      2. The months required to reach that position (based on their time commitment)
      3. The skills needed to qualify for that position
      4. A brief description of the role and what they'll be doing
      5. Recommended learning resources or certification paths
      
      Additionally, include an "aiFeedback" field in the FIRST object of the array. This should be a personalized coaching message (50-100 words) summarizing:
      - A quick assessment of their current position vs. their goal
      - Key strengths they can leverage based on their current skills
      - The biggest gaps they need to address
      - Action items they should focus on immediately
      - Words of encouragement about their career journey
      
      Format your response as a valid JSON array where each object represents a career stage:
      [
        {
          "title": "Position Title (maximum 4 words)",
          "timeToAchieve": number_of_months,
          "requiredSkills": ["Skill 1", "Skill 2", "Skill 3", ...],
          "description": "Brief description of the role and responsibilities",
          "learningResources": ["Resource 1", "Resource 2", ...],
          "aiFeedback": "Only include this in the first object. Add personalized career coaching feedback here..."
        },
        ...
      ]
      
      Important guidelines:
      - Include as many steps as necessary to reach the goal (no short paths)
      - The path should be highly specific to the user's details and career goal
      - The path should match the requested timeframe: ${
        payload.goalTimeframe || "N/A"
      }
      - Be realistic about time requirements based on their commitment level (${
        payload.hoursPerWeek || "N/A"
      })
      - Account for their current career stage (${
        payload.careerStage || "N/A"
      }) and education (${payload.educationLevel || "N/A"})
      - If they're currently studying (${
        payload.currentlyStudying || "N/A"
      }), factor that into the timeline
      - Consider their field of study (${
        payload.major || "N/A"
      }) and work experience (${
      payload.yearsOfExperience || payload.workExperience || "N/A"
    })
      - Provide a gradual progression that builds on existing skills
      - Make each step achievable but challenging
      - The aiFeedback should be written in a supportive, motivational coach's voice
      - Ensure all JSON is properly formatted and valid
      - Include only the JSON array in your response, no other text or explanation
    `;

    // Generate response using Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;

    // Parse the output from Gemini to get valid JSON
    let careerPath;
    try {
      const responseText = response.text().trim();
      const jsonText = responseText.replace(/```json\n?|\n?```/g, "").trim();
      careerPath = JSON.parse(jsonText);
      // Validate careerPath structure
      if (!Array.isArray(careerPath) || careerPath.length === 0) {
        throw new Error("Career path must be a non-empty array");
      }
      careerPath.forEach((step, index) => {
        if (
          !step.title ||
          typeof step.timeToAchieve !== "number" ||
          !Array.isArray(step.requiredSkills) ||
          !step.description ||
          !Array.isArray(step.learningResources)
        ) {
          throw new Error(`Invalid career path step at index ${index}`);
        }
        if (index === 0 && !step.aiFeedback) {
          throw new Error("First step must include aiFeedback");
        }
      });

      // Increment career track usage
      await user.incrementCareerTrackUsage();

      // Save career path
      user.savedCareerPaths = user.savedCareerPaths || [];
      user.savedCareerPaths.push({
        inputs: payload,
        careerPath,
        createdAt: new Date(),
      });
      await user.save();
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      return res.status(500).json({
        error: "Failed to generate career path",
        details: parseError.message || "Could not parse the AI response",
      });
    }

    // Return the career path to the client
    res.json({
      careerPath,
      message: "Career path generated successfully",
    });
  } catch (error) {
    console.error("Error generating career path:", error);
    res.status(500).json({ error: "Failed to generate career path" });
  }
});
// GET /api/career-track/usage
// Get user's current career track usage
router.get("/usage", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const usage = user.checkCareerTrackUsage();
    res.json({
      usageCount: usage.usageCount,
      remainingCount: usage.remainingCount,
      canUse: usage.canUse,
    });
  } catch (err) {
    console.error("Error fetching career track usage:", err);
    res.status(500).json({ error: "Server error" });
  }
});
// GET /api/career-track/saved
// Get all saved career paths for the user
router.get("/saved", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      savedCareerPaths: user.savedCareerPaths || [],
    });
  } catch (err) {
    console.error("Error fetching saved career paths:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/career-track/:id
// Get a specific career path by ID
router.get("/:id", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const careerPath = (user.savedCareerPaths || []).find(
      (path) => path._id.toString() === req.params.id
    );

    if (!careerPath) {
      return res.status(404).json({ error: "Career path not found" });
    }

    res.json({
      careerPath,
    });
  } catch (err) {
    console.error("Error fetching career path:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/career-track/:id
// Delete a specific career path
router.delete("/:id", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.savedCareerPaths) {
      user.savedCareerPaths = user.savedCareerPaths.filter(
        (path) => path._id.toString() !== req.params.id
      );
      await user.save();
    }

    res.json({ message: "Career path deleted successfully" });
  } catch (err) {
    console.error("Error deleting career path:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;

const express = require("express");
const axios = require("axios");
const dotenv = require("dotenv");
const auth = require("../../middleware/auth"); // Import auth middleware
const User = require("../../models/User"); // Import User model
const { GoogleGenerativeAI } = require("@google/generative-ai");

dotenv.config();
const router = express.Router();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// API route for generating roadmap - Add auth middleware and usage check
router.post("/suggest", auth, async (req, res) => {
  try {
    // Get user from auth middleware
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if the user has remaining AI suggestion uses for today
    const usageStatus = user.checkAISuggestionsUsage();

    if (!usageStatus.canUse) {
      return res.status(429).json({
        error: "Daily limit reached",
        message:
          "You have reached your daily limit of 3 AI suggestions. Please try again tomorrow.",
        usageCount: usageStatus.usageCount,
        remainingCount: 0,
      });
    }

    const { answers } = req.body;

    // Prepare the prompt for Gemini
    const prompt = `
You are a professional career guidance expert. Your task is to Create an in-depth, personalized learning roadmap with comprehensive, actionable guidance tailored specifically to the user's profile.

User Profile Context:
- Career Goal: ${answers.careerGoals}
- Experience Level: ${answers.experience}
- Learning Preference: ${answers.learningStyle}
- Time Commitment: ${answers.timeCommitment}
- Current Knowledge: ${
      Array.isArray(answers.currentKnowledge)
        ? answers.currentKnowledge.join(", ")
        : answers.currentKnowledge || "None"
    }
- Development Preference: ${answers.preference}

Roadmap Composition Guidelines:
1. Provide a hyper-personalized, strategic learning path
2. Break down the journey into clear, progressive phases
3. Offer precise skill acquisition recommendations
4. Include practical learning resources and project suggestions
5. Align content with user's specific background and goals

Detailed Roadmap Structure:

<h1>Comprehensive Learning Roadmap for ${answers.careerGoals}</h1>

<section>
  <h2>Personal Learning Journey Overview</h2>
  <p>A brief overview of the user's career goals, experience level, time commitment, current knowledge and learning preferences and how the roadmap will guide them.</p>
</section>

<section>
  <h2>Initial Assessment and Starting Point</h2>
  <h3>Skill Gap Analysis</h3>
  <ul>
    <li>Current Strengths: [Detailed breakdown of existing skills]</li>
    <li>Critical Skills to Develop: [Precise skill requirements]</li>
    <li>Recommended Learning Acceleration Strategies</li>
    ... Add more assessment details as needed
  </ul>
<section> 
  <h2>Structured Learning Phases</h2>
  <ol>
    <li>
      <h3>Phases (Weeks required)</h3>
      <p>Intensive fundamental skill-building aligned with ${
        answers.careerGoals
      }</p>
      <ul>
        <li>You can add lists of skills here required for this phase as may as you want with a topic and then its description</li>
      </ul>
    </li>
    <li>
      ... Add more phases as needed for the natural flow of the roadmap required for user selected preferences to learn, with same structure as above
    </li>
  </ol>
</section>
<section>
<section>
  <h2>Critical Skills Mastery Roadmap</h2>
  <ul>
    <li>
      <h3>you can add here skills that are required for the roadmap</h3>
      <p>Detailed breakdown of essential technical competencies</p>
      <ul>
        <li>e.g., Programming Languages</li>
        ... Add more sub-skills as needed with a brief description
      </ul>
    </li>
    <li>
      <h3>Soft Skills Development</h3>
      <p>Professional and interpersonal skill enhancement</p>
      <ul>
        <li>e.g., Communication Techniques</li>
        ... Add more soft skills as needed with a brief description
      </ul>
    </li>
    ... Add more critical skills categories as required for the roadmap
  </ul>
</section>

<section>
  <h2>Curated Learning Resources</h2>
  <ul>
    <li>
      <h3>Online Courses and Platforms</h3>
      <p>Recommended learning resources matching your ${
        answers.learningStyle
      } preference</p>
      <ul>
        <li>Platform-Specific Courses</li>
        <li>Certifications</li>
        <li>Interactive Learning Channels</li>
      </ul>
    </li>
    <li>
      <h3>Books and Documentation</h3>
      <p>Essential reading materials for comprehensive understanding with links to read them online</p>
    </li>
    <li>
      <h3>Community and Networking Resources</h3>
      <p>Professional groups, forums, and collaboration platforms</p>
    </li>
  </ul>
</section>

<section>
  <h2>Strategic Project Portfolio</h2>
  <ul>
    <li>
      <h3>Beginner-Level Projects</h3>
      <p>Foundational project ideas to build initial confidence</p>
    </li>
    <li>
      <h3>Intermediate Challenge Projects</h3>
      <p>Complex projects demonstrating advanced skills</p>
    </li>
    <li>
      <h3>Portfolio-Worthy Capstone Projects</h3>
      <p>Comprehensive projects showcasing professional capabilities</p>
    </li>
  </ul>
</section>

<section>
  <h2>Continuous Learning and Adaptation Strategy</h2>
  <p>Ongoing skill refinement and staying current with ${
    answers.careerGoals
  } industry trends</p>
  <ul>
    <li>Regular Skill Assessment Techniques</li>
    <li>Emerging Technology Tracking</li>
    <li>Professional Development Milestones</li>
  </ul>
</section>

Customization Factors:
- Precisely tailored to individual learning preferences
- Adaptable to ${answers.timeCommitment} weekly time investment
- Considers existing ${answers.experience} experience level
- Aligned with ${answers.careerGoals} career trajectory

Strategic Recommendations:
1. Implement a flexible, iterative learning approach
2. Prioritize hands-on, project-based learning
3. Maintain consistent skill progression
4. Develop both technical and soft skills
5. Build a comprehensive, showcasable portfolio
`;
    // Generate response using Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const roadmap = response
      .text()
      .replace(/```html|```/g, "")
      .trim();
    // Save the roadmap to the user's saved suggestions
    user.savedAISuggestions.push({
      answers,
      roadmap,
      createdAt: new Date(),
    });
    // Increment the user's AI suggestions usage count
    await user.incrementAISuggestionsUsage();
    await user.save();

    // Get updated usage status after incrementing
    const updatedUsage = user.checkAISuggestionsUsage();

    res.json({
      roadmap,
      usageInfo: {
        usageCount: updatedUsage.usageCount,
        remainingCount: updatedUsage.remainingCount,
      },
    });
  } catch (error) {
    console.error("Error generating roadmap:", error);
    res.status(500).json({ error: "Failed to generate roadmap" });
  }
});
// Add this to your user routes file (e.g., routes/api/user.js)

// GET user's AI suggestions usage
router.get("/ai-suggestions-usage", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const usageStatus = user.checkAISuggestionsUsage();

    res.json({
      usageCount: usageStatus.usageCount,
      remainingCount: usageStatus.remainingCount,
    });
  } catch (err) {
    console.error("Error fetching AI suggestions usage:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/saved-suggestions", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      savedSuggestions: user.savedAISuggestions,
    });
  } catch (err) {
    console.error("Error fetching saved AI suggestions:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET a single AI suggestion by ID
router.get("/:id", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Find the suggestion in the user's saved suggestions array
    const suggestion = user.savedAISuggestions.find(
      (suggestion) => suggestion._id.toString() === req.params.id
    );

    if (!suggestion) {
      return res.status(404).json({ error: "Suggestion not found" });
    }

    res.json({
      success: true,
      suggestion,
    });
  } catch (err) {
    console.error("Error fetching AI suggestion:", err);
    res.status(500).json({ error: "Server error" });
  }
});
// Delete AI Suggestion
router.delete("/ai-suggestions/:suggestionId", auth, async (req, res) => {
  try {
    const userId = req.user.id; // Ensure you have user authentication in place
    const { suggestionId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Remove the suggestion by filtering
    user.savedAISuggestions = user.savedAISuggestions.filter(
      (suggestion) => suggestion._id.toString() !== suggestionId
    );

    await user.save();
    res.status(200).json({ message: "AI suggestion deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error", error });
  }
});

module.exports = router;

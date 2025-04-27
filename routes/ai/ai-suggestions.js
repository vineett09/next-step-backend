const express = require("express");
const axios = require("axios");
const dotenv = require("dotenv");
const auth = require("../../middleware/auth");
const User = require("../../models/User");
const sanitizeHtml = require("sanitize-html");
const { GoogleGenerativeAI } = require("@google/generative-ai");

dotenv.config();
const router = express.Router();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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
    // Updated prompt for Gemini API
    const prompt = `
You are a professional career guidance expert specialized in creating personalized tech learning roadmaps. Your task is to create a comprehensive, actionable, and structured learning guide tailored to the user's specific profile.

USER PROFILE:
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

OUTPUT REQUIREMENTS:
1. Deliver your response as properly formatted HTML without any markdown or code blocks
2. Follow EXACTLY the HTML structure template provided below
3. Fill in each section with personalized, detailed content based on the user profile
4. Include specific, actionable advice and resources
5. Ensure all HTML tags are properly closed and structured
6. Don't include any extra line or something outside the HTML structure in response

HTML STRUCTURE TEMPLATE:
<h1>Personalized ${answers.careerGoals} Learning Roadmap</h1>

<section>
  <h2>Your Learning Profile</h2>
  <p>[Provide a brief personalized overview of the user's background, goals and how this roadmap addresses their specific situation]</p>
  
  <h3>Personalized Assessment</h3>
  <ul>
    <li><strong>Current Strengths:</strong> [Based on their current knowledge]</li>
    <li><strong>Areas to Develop:</strong> [Key skills they need]</li>
    <li><strong>Time Optimization:</strong> [Strategies based on their ${
      answers.timeCommitment
    } weekly commitment]</li>
    <li><strong>Learning Approach:</strong> [Tailored to their ${
      answers.learningStyle
    } preference]</li>
  </ul>
</section>

<section>
  <h2>Essential Skills Foundation</h2>
  <div class="essential-skills-container">
  <span class="essential-skill-badge">SkillName</span>
    [List 8-12 essential skills as skill badges]
  </div>
  
  <h3>Core Fundamentals</h3>
  <ul>
    <li><strong>[Fundamental 1]:</strong> [Brief description]</li>
    <li><strong>[Fundamental 2]:</strong> [Brief description]</li>
    [Add 3-5 more fundamentals]
  </ul>
</section>

<section>
  <h2>Learning Phases</h2>
  
  <h3>Phase 1: Phase Name (X weeks)</h3>
  <p>[Description of this phase tailored to experience level]</p>
  <ul>
    <li><strong>Key Focus:</strong> [Main skills/concepts]</li>
    <li><strong>Learning Materials:</strong> [Specific resources matching their learning style]</li>
    <li><strong>Practical Project:</strong> [A specific beginner project idea with scope]</li>
    <li><strong>Success Metrics:</strong> [How to know when to advance]</li>
    ... [Add 2-3 more key points for this phase] as required 
  </ul>
  
  ... [Add more phases with similar structure as required, adjusting for experience level and time commitment]

<section>
  <h2>Technology Stack Recommendations</h2>
  
  <h3>Primary Technologies</h3>
  <ul>
    <li><strong>[Technology 1]:</strong> [Why it's relevant to their goals]</li>
    <li><strong>[Technology 2]:</strong> [Why it's relevant to their goals]</li>
    <li><strong>[Technology 3]:</strong> [Why it's relevant to their goals]</li>
    [Add 2-4 more technologies]
  </ul>
  
  <h3>Complementary Tools</h3>
  <ul>
    <li><strong>[Tool 1]:</strong> [Brief description and purpose]</li>
    <li><strong>[Tool 2]:</strong> [Brief description and purpose]</li>
    [Add 2-3 more tools]
  </ul>
</section>

<section>
  <h2>Curated Learning Resources</h2>
  
  <h3>For Your ${answers.learningStyle} Learning Style</h3>
  <ul>
    <li><strong>[Resource Name]:</strong> [Brief description] - [What makes it valuable]</li>
    <li><strong>[Resource Name]:</strong> [Brief description] - [What makes it valuable]</li>
    [Add 3-5 more resources specifically matching their learning style]
  </ul>
  
  <h3>Essential References</h3>
  <ul>
    <li><strong>[Reference Name]:</strong> [Brief description]</li>
    <li><strong>[Reference Name]:</strong> [Brief description]</li>
    [Add 2-3 more references]
  </ul>
  
  <h3>Community Resources</h3>
  <ul>
    <li><strong>[Community Name]:</strong> [What makes it valuable]</li>
    <li><strong>[Community Name]:</strong> [What makes it valuable]</li>
    [Add 1-2 more communities]
  </ul>
</section>

<section>
  <h2>Project-Based Learning Path</h2>
  
  <h3>Beginner Projects</h3>
  <ul>
    <li>
      <strong>[Project Name]</strong>
      <p>[Detailed description with specific implementation steps]</p>
      <p><strong>Skills practiced:</strong> [List specific skills]</p>
    </li>
    [Add 1-2 more beginner projects with similar detail]
  </ul>
  ... [Add intermediate and advanced projects with similar detail, adjusting for experience level]

<section>
  <h2>Roadmap Implementation Plan</h2>
  
  <h3>Weekly Schedule Template (${answers.timeCommitment})</h3>
  <ul>
    <li><strong>Days 1-2:</strong> [Focused activity recommendation]</li>
    <li><strong>Days 3-4:</strong> [Focused activity recommendation]</li>
    <li><strong>Days 5-7:</strong> [Focused activity recommendation]</li>
  </ul>
  
  <h3>Progress Tracking Method</h3>
  <ul>
    <li><strong>Milestone 1:</strong> [Specific achievement at 25% of the journey]</li>
    <li><strong>Milestone 2:</strong> [Specific achievement at 50% of the journey]</li>
    <li><strong>Milestone 3:</strong> [Specific achievement at 75% of the journey]</li>
    <li><strong>Final Milestone:</strong> [End goal achievement]</li>
  </ul>
</section>

<section>
  <h2>Industry Insights for ${answers.careerGoals}</h2>
  
  <h3>Current Trends</h3>
  <ul>
    <li><strong>[Trend 1]:</strong> [How it impacts this career path]</li>
    ... [Add more trends with descriptions]
  </ul>
  
  <h3>Career Growth Opportunities</h3>
  <ul>
    <li><strong>[Career Path 1]:</strong> [Description of potential evolution]</li>
    ... [Add more career paths with descriptions]
  </ul>
</section>

<section>
  <h2>Next Steps</h2>
  <ol>
    <li>[Immediate first action to take]</li>
    <li>[Second immediate action]</li>
    <li>[Third immediate action]</li>
    <li>[Ongoing practice recommendation]</li>
  </ol>
  
  <h3>Continuous Learning Strategy</h3>
  <p>[Personalized advice for staying current in the field while balancing ${
    answers.timeCommitment
  } time commitment]</p>
</section>

IMPORTANT GUIDELINES:
1. Be extremely specific and practical in your advice
2. Tailor content precisely to user's experience level (${answers.experience})
3. Focus on actionable steps rather than generic advice
4. Include ONLY relevant technologies for their specific career goal
5. Adjust the timeframes in phases according to their time commitment (${
      answers.timeCommitment
    })
6. Ensure all HTML is structured exactly as shown in the template
7. For beginner content, be more detailed and explanatory
8. For advanced users, go deeper into specialized topics
9. Link everything back to their career goal of becoming a ${
      answers.careerGoals
    }

Please ensure your response follows this exact HTML structure format without any markdown formatting, code blocks, or additional wrapping tags.
`;
    // Generate response using Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const rawRoadmap = response
      .text()
      .replace(/```html|```/g, "")
      .trim();

    // Sanitize HTML to prevent XSS vulnerabilities while preserving your structure
    const roadmap = sanitizeHtml(rawRoadmap, {
      allowedTags: [
        "h1",
        "h2",
        "h3",
        "p",
        "ul",
        "ol",
        "li",
        "strong",
        "em",
        "section",
        "div",
        "span",
      ],
      allowedAttributes: {
        div: ["class"],
        section: ["class"],
        span: ["class"],
      },
    });

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

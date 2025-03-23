const express = require("express");
const axios = require("axios");
const dotenv = require("dotenv");
const auth = require("../../middleware/auth"); // Import auth middleware
const User = require("../../models/User"); // Import User model
const { GoogleGenerativeAI } = require("@google/generative-ai");

dotenv.config();
const router = express.Router();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// API route for generating roadmap
router.post("/suggest", async (req, res) => {
  try {
    const { answers } = req.body;

    // Prepare the prompt for Gemini
    // Updated prompt section in the route handler
    const prompt = `
Based on the following user responses, create a detailed, personalized learning roadmap for someone who wants to become a expert in ${
      answers.careerGoals
    }. 
This roadmap will be displayed directly to the user in HTML format with appropriate styling.

User preferences:
- Preference: ${answers.preference}
- Previous coding experience: ${answers.experience}
- Career goal: ${answers.careerGoals}
- Available time commitment: ${answers.timeCommitment}
- Learning style preference: ${answers.learningStyle}
- Current knowledge: ${
      Array.isArray(answers.currentKnowledge)
        ? answers.currentKnowledge.join(", ")
        : answers.currentKnowledge || "None"
    }

Please structure your response as HTML with the following sections, using appropriate HTML elements and classes:

<div class="roadmap-section">
  <h2>Your Personalized Learning Journey</h2>
  <p>[Provide a tailored introduction and summary of the recommended path based on their preferences]</p>
</div>

<div class="roadmap-section">
  <h3>Step-by-Step Learning Timeline</h3>
  <div class="timeline">
    [Create a timeline with proper HTML structure using the timeline-item class for each phase]
    <div class="timeline-item">
      <h4>Phase 1: Foundation (Weeks 1-4)</h4>
      <p>[Detailed description of what to learn]</p>
    </div>
    [Additional phases with appropriate timing]
  </div>
</div>

<div class="roadmap-section">
  <h3>Essential Skills to Master</h3>
  <p>[Introduction paragraph about required skills]</p>
  <div>
    [List skills with the skill-tag class]
    <span class="skill-tag">HTML</span>
    [Additional skill tags]
  </div>
  <ul>
    [Detailed explanation of key skills with actionable advice]
  </ul>
</div>

<div class="roadmap-section">
  <h3>Recommended Learning Resources</h3>
  <p>[Introduction to resources section]</p>
  [List resources using the resource-card class]
  <div class="resource-card">
    <h4>[Resource Name]</h4>
    <p>[Brief description of the resource and why it's recommended for them]</p>
  </div>
  [Additional resources]
</div>

<div class="roadmap-section">
  <h3>Portfolio Project Ideas</h3>
  <p>[Introduction to projects section]</p>
  [List project ideas using the project-idea class]
  <div class="project-idea">
    <h4>[Project Name]</h4>
    <p>[Project description with specific technologies to use and skills to practice]</p>
  </div>
  [Additional project ideas]
</div>

Ensure the content is:
1. Specifically tailored to the user's preferences and career goals
2. Practical and actionable rather than general advice
3. Appropriately detailed based on their experience level
4. Focused on their available time commitment
5. Aligned with their preferred learning style
6. Building upon their current knowledge

Provide specific details in each section - tool names, course titles, specific concepts, and tangible project ideas rather than generic advice.
`;
    // Generate response using Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const roadmap = response
      .text()
      .replace(/```html|```/g, "")
      .trim();

    res.json({ roadmap });
  } catch (error) {
    console.error("Error generating roadmap:", error);
    res.status(500).json({ error: "Failed to generate roadmap" });
  }
});

module.exports = router;

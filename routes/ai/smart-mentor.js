// ai-mentor-routes.js
const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const User = require("../../models/User"); // Adjust path as needed
const auth = require("../../middleware/auth"); // Import your auth middleware
const router = express.Router();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// Get user's AI mentor usage
router.get("/usage", auth, async (req, res) => {
  try {
    const usage = req.user.checkChatbotUsage(); // Using existing chatbot usage for AI mentor
    res.json({
      success: true,
      ...usage,
    });
  } catch (error) {
    console.error("Error getting usage:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get usage information",
    });
  }
});

// Enhanced function to generate comprehensive user context for AI
const generateUserContext = async (user) => {
  try {
    // === ROADMAP PROGRESS DATA ===
    const roadmapProgressData = {};
    let totalCompletedNodes = 0;
    let totalNodesAcrossAllRoadmaps = 0;

    user.roadmapProgress?.forEach((roadmapProgress) => {
      const roadmapId = roadmapProgress.roadmapId;
      const completedNodes = roadmapProgress.completedNodes.filter(
        (node) => node.completed
      );
      const totalNodes = roadmapProgress.totalNodes || 0;

      roadmapProgressData[roadmapId] = {
        completed: completedNodes.length,
        total: totalNodes,
        completionRate:
          totalNodes > 0
            ? ((completedNodes.length / totalNodes) * 100).toFixed(1)
            : 0,
        lastUpdated: roadmapProgress.lastUpdated,
        recentCompletions: completedNodes
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          .slice(0, 3)
          .map((node) => ({
            nodeId: node.nodeId,
            timestamp: node.timestamp,
          })),
      };

      totalCompletedNodes += completedNodes.length;
      totalNodesAcrossAllRoadmaps += totalNodes;
    });

    // === RECENT ACTIVITY ANALYSIS ===
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let recentWeekActivity = 0;
    let recentMonthActivity = 0;
    const recentCompletions = [];

    user.roadmapProgress?.forEach((roadmapProgress) => {
      roadmapProgress.completedNodes.forEach((node) => {
        if (node.completed && node.timestamp) {
          const nodeDate = new Date(node.timestamp);
          if (nodeDate > weekAgo) {
            recentWeekActivity++;
          }
          if (nodeDate > monthAgo) {
            recentMonthActivity++;
            recentCompletions.push({
              roadmapId: roadmapProgress.roadmapId,
              nodeId: node.nodeId,
              timestamp: node.timestamp,
            });
          }
        }
      });
    });

    // Sort recent completions by timestamp
    recentCompletions.sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );

    // === LEARNING STREAK CALCULATION ===
    const allCompletedNodes = [];
    user.roadmapProgress?.forEach((roadmapProgress) => {
      roadmapProgress.completedNodes.forEach((node) => {
        if (node.completed && node.timestamp) {
          allCompletedNodes.push({
            date: new Date(node.timestamp),
            roadmapId: roadmapProgress.roadmapId,
            nodeId: node.nodeId,
          });
        }
      });
    });

    // Calculate current streak
    const uniqueDates = [
      ...new Set(
        allCompletedNodes.map((node) => node.date.toISOString().split("T")[0])
      ),
    ]
      .sort()
      .reverse();

    let currentStreak = 0;
    if (uniqueDates.length > 0) {
      const today = new Date().toISOString().split("T")[0];
      let checkDate = new Date();

      for (let i = 0; i < uniqueDates.length; i++) {
        const currentDateStr = checkDate.toISOString().split("T")[0];
        if (uniqueDates.includes(currentDateStr)) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    // === BOOKMARKS AND FOLLOWS ===
    const bookmarkedRoadmaps = user.bookmarkedRoadmaps || [];
    const followedRoadmaps = user.followedRoadmaps || [];

    // Analyze bookmark usage
    const bookmarkedWithProgress = bookmarkedRoadmaps.filter(
      (roadmapId) => roadmapProgressData[roadmapId]
    );
    const bookmarkedWithoutProgress = bookmarkedRoadmaps.filter(
      (roadmapId) => !roadmapProgressData[roadmapId]
    );

    // === AI GENERATED CONTENT ===
    const aiGeneratedRoadmaps = user.aiGeneratedRoadmaps || [];
    const recentAIRoadmaps = aiGeneratedRoadmaps
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);

    const savedAISuggestions = user.savedAISuggestions || [];
    const recentAISuggestions = savedAISuggestions
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 3);

    // === CAREER PATHS ===
    const savedCareerPaths = user.savedCareerPaths || [];
    const latestCareerPath =
      savedCareerPaths.length > 0
        ? savedCareerPaths[savedCareerPaths.length - 1]
        : null;

    // === USAGE STATISTICS ===
    const usageStats = {
      roadmapGeneration: user.checkRoadmapUsage(),
      chatbot: user.checkChatbotUsage(),
      aiSuggestions: user.checkAISuggestionsUsage(),
      careerTrack: user.checkCareerTrackUsage(),
    };

    // === MOST ACTIVE ROADMAPS ===
    const roadmapsByActivity = Object.entries(roadmapProgressData)
      .sort((a, b) => {
        const aActivity = a[1].recentCompletions.length;
        const bActivity = b[1].recentCompletions.length;
        return bActivity - aActivity;
      })
      .slice(0, 3);

    // === COMPLETION INSIGHTS ===
    const overallCompletionRate =
      totalNodesAcrossAllRoadmaps > 0
        ? ((totalCompletedNodes / totalNodesAcrossAllRoadmaps) * 100).toFixed(1)
        : 0;

    const highProgressRoadmaps = Object.entries(roadmapProgressData)
      .filter(([_, data]) => parseFloat(data.completionRate) > 70)
      .map(([id, data]) => ({ id, ...data }));

    const stagnantRoadmaps = Object.entries(roadmapProgressData)
      .filter(([_, data]) => {
        const hasRecentActivity = data.recentCompletions.length > 0;
        const hasProgress = parseFloat(data.completionRate) > 0;
        const notComplete = parseFloat(data.completionRate) < 100;
        return hasProgress && notComplete && !hasRecentActivity;
      })
      .map(([id, data]) => ({ id, ...data }));

    // === BUILD COMPREHENSIVE CONTEXT ===
    const context = `
===== USER LEARNING PROFILE =====
User: ${user.username || user.email}
Account Created: ${
      user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "Unknown"
    }

===== OVERALL PROGRESS SUMMARY =====
• Total Progress: ${totalCompletedNodes}/${totalNodesAcrossAllRoadmaps} nodes completed (${overallCompletionRate}% overall completion)
• Active Roadmaps: ${Object.keys(roadmapProgressData).length}
• Current Learning Streak: ${currentStreak} days
• Recent Activity: ${recentWeekActivity} completions this week, ${recentMonthActivity} this month

===== ROADMAP PROGRESS DETAILS =====
${Object.entries(roadmapProgressData)
  .map(
    ([roadmapId, data]) =>
      `• ${roadmapId}: ${data.completed}/${data.total} nodes (${
        data.completionRate
      }% complete)
    Last Updated: ${
      data.lastUpdated
        ? new Date(data.lastUpdated).toLocaleDateString()
        : "Never"
    }
    Recent Activity: ${data.recentCompletions.length} recent completions`
  )
  .join("\n")}

===== RECENT LEARNING ACTIVITY =====
${
  recentCompletions
    .slice(0, 10)
    .map(
      (completion) =>
        `• Completed "${completion.nodeId}" in ${
          completion.roadmapId
        } (${new Date(completion.timestamp).toLocaleDateString()})`
    )
    .join("\n") || "• No recent activity"
}

===== ROADMAP ENGAGEMENT =====
• Bookmarked Roadmaps: ${bookmarkedRoadmaps.length} total
  - With Progress: ${bookmarkedWithProgress.join(", ") || "None"}
  - Not Started: ${bookmarkedWithoutProgress.join(", ") || "None"}
• Following Custom Roadmaps: ${followedRoadmaps.length}

===== AI-GENERATED CONTENT =====
• AI Generated Roadmaps: ${aiGeneratedRoadmaps.length} total
  Recent: ${
    recentAIRoadmaps
      .map(
        (r) => `"${r.title}" (${new Date(r.createdAt).toLocaleDateString()})`
      )
      .join(", ") || "None"
  }
• Saved AI Suggestions: ${savedAISuggestions.length} total
• Recent AI Interactions: ${recentAISuggestions.length} saved suggestions

===== CAREER INFORMATION =====
${
  latestCareerPath
    ? `
• Career Goal: ${latestCareerPath.inputs?.careerGoal || "Not specified"}
• Career Stage: ${latestCareerPath.inputs?.careerStage || "Not specified"}
• Current Skills: ${
        Array.isArray(latestCareerPath.inputs?.currentSkills)
          ? latestCareerPath.inputs.currentSkills.join(", ")
          : "Not specified"
      }
• Years of Experience: ${
        latestCareerPath.inputs?.yearsOfExperience || "Not specified"
      }
• Education Level: ${latestCareerPath.inputs?.educationLevel || "Not specified"}
• Learning Preference: ${
        latestCareerPath.inputs?.learningPreference || "Not specified"
      }
• Goal Timeframe: ${latestCareerPath.inputs?.goalTimeframe || "Not specified"}
`
    : "• No career path information available"
}

===== LEARNING INSIGHTS =====
• High Progress Roadmaps (>70%): ${
      highProgressRoadmaps
        .map((r) => `${r.id} (${r.completionRate}%)`)
        .join(", ") || "None"
    }
• Stagnant Roadmaps (need attention): ${
      stagnantRoadmaps
        .map((r) => `${r.id} (${r.completionRate}%)`)
        .join(", ") || "None"
    }
• Most Active Recently: ${
      roadmapsByActivity.length > 0 ? roadmapsByActivity[0][0] : "None"
    }

===== USAGE PATTERNS =====
• Daily Limits: Roadmaps ${usageStats.roadmapGeneration.usageCount}/10, Chat ${
      usageStats.chatbot.usageCount
    }/10, AI Suggestions ${
      usageStats.aiSuggestions.usageCount
    }/3, Career Track ${usageStats.careerTrack.usageCount}/3
• Platform Engagement: ${
      user.roadmapUsage?.length || 0
    } days with roadmap activity, ${
      user.chatbotUsage?.length || 0
    } days with chat activity
`;

    return context;
  } catch (error) {
    console.error("Error generating user context:", error);
    return `User context generation failed: ${error.message}`;
  }
};

// AI Mentor chat endpoint with enhanced context
router.post("/chat", auth, async (req, res) => {
  try {
    // Check usage limits
    const usage = req.user.checkChatbotUsage();
    if (!usage.canUse) {
      return res.status(429).json({
        success: false,
        error: "Daily limit reached",
        code: "USAGE_LIMIT_EXCEEDED",
        usage: usage,
      });
    }

    const { message, conversationHistory = [] } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "Message is required",
        code: "INVALID_INPUT",
      });
    }

    // Validate message length
    if (message.length > 1000) {
      return res.status(400).json({
        success: false,
        error: "Message is too long. Please keep it under 1000 characters.",
        code: "MESSAGE_TOO_LONG",
      });
    }

    // Generate comprehensive user context
    const userContext = await generateUserContext(req.user);

    // Format conversation history
    const historyText = conversationHistory
      .slice(-8) // Last 8 messages for better context
      .map(
        (msg) => `${msg.type === "user" ? "User" : "AI Mentor"}: ${msg.content}`
      )
      .join("\n");

    // Create enhanced prompt
    const prompt = `
You are an expert AI Learning Mentor for a comprehensive learning roadmap platform. Your role is to provide personalized, actionable guidance based on detailed user analytics and learning patterns.

${userContext}

===== CONVERSATION HISTORY =====
${historyText || "No previous conversation"}

===== CURRENT USER MESSAGE =====
"${message}"

===== YOUR ROLE & GUIDELINES =====
1. **Personalized Responses**: Always reference specific data from their profile - progress percentages, roadmap names, completion streaks, recent activity
2. **Data-Driven Insights**: Use their actual statistics to provide meaningful analysis and recommendations
3. **Progress Celebration**: Acknowledge their achievements and milestones specifically
4. **Actionable Guidance**: Provide concrete next steps based on their current progress and goals
5. **Learning Strategy**: Help optimize their learning approach based on their patterns and preferences
6. **Career Alignment**: Connect learning recommendations to their stated career goals
7. **Motivation & Support**: Be encouraging while being realistic about challenges
8. **Platform Utilization**: Help them make better use of bookmarks, AI features, and roadmap organization

===== RESPONSE GUIDELINES =====
• Reference specific roadmaps, completion rates, and recent activity from their data
• If they ask about progress, use exact numbers and percentages from their profile
• Suggest specific actions like "Continue your Machine Learning roadmap (currently 67% complete)"
• For career questions, reference their stated goals and current skill set
• Mention relevant unused bookmarks or stagnant roadmaps when appropriate
• Keep responses conversational but information-rich (3-5 paragraphs max)
• If you notice concerning patterns (like no recent activity), address them supportively
• For technical questions, provide clear explanations and suggest relevant roadmaps from their collection

===== EXAMPLE REFERENCE PATTERNS =====
✓ "I see you've completed 45 nodes across 3 roadmaps with an impressive 87% completion rate"
✓ "Your JavaScript roadmap is 90% complete - you're so close to finishing!"
✓ "I notice you haven't made progress on your bookmarked Python roadmap yet"
✓ "Your 12-day learning streak shows great consistency"
✓ "Based on your goal to become a Data Scientist and your current Machine Learning progress..."

Respond as their knowledgeable, supportive AI mentor who knows their learning journey intimately:`;

    // Generate AI response
    const result = await model.generateContent(prompt);
    const response = result.response;
    const aiResponse = response.text();

    // Increment usage
    await req.user.incrementChatbotUsage();

    // Get updated usage after increment
    const updatedUsage = req.user.checkChatbotUsage();

    res.json({
      success: true,
      response: aiResponse,
      usage: {
        usageCount: updatedUsage.usageCount,
        remainingCount: updatedUsage.remainingCount,
        canUse: updatedUsage.canUse,
      },
    });
  } catch (error) {
    console.error("Error in AI mentor chat:", error);

    // Handle specific Gemini API errors
    if (error.message?.includes("API_KEY")) {
      return res.status(500).json({
        success: false,
        error: "AI service configuration error",
        code: "AI_CONFIG_ERROR",
      });
    }

    if (
      error.message?.includes("RATE_LIMIT") ||
      error.message?.includes("quota")
    ) {
      return res.status(429).json({
        success: false,
        error: "AI service temporarily unavailable. Please try again later.",
        code: "AI_RATE_LIMIT",
      });
    }

    // Check if it's a token-related error
    if (error.message?.includes("Invalid token") || error.status === 401) {
      return res.status(401).json({
        success: false,
        error: "Authentication failed",
        code: "AUTH_ERROR",
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to generate AI response. Please try again.",
      code: "AI_GENERATION_ERROR",
    });
  }
});

// Enhanced insights endpoint with comprehensive roadmap data
router.get("/insights", auth, async (req, res) => {
  try {
    const user = req.user;

    // Calculate comprehensive roadmap statistics
    const roadmapStats = {};
    let totalCompletedNodes = 0;
    let totalNodes = 0;

    // Process each roadmap's progress with proper data structure
    user.roadmapProgress?.forEach((roadmapProgress) => {
      const roadmapId = roadmapProgress.roadmapId;
      const completedNodes = roadmapProgress.completedNodes.filter(
        (node) => node.completed
      );
      const totalNodesInRoadmap = roadmapProgress.totalNodes || 0;
      const completedCount = completedNodes.length;

      roadmapStats[roadmapId] = {
        roadmapId,
        completed: completedCount,
        total: totalNodesInRoadmap,
        completionRate:
          totalNodesInRoadmap > 0
            ? ((completedCount / totalNodesInRoadmap) * 100).toFixed(1)
            : 0,
        lastUpdated: roadmapProgress.lastUpdated,
        recentActivity: {
          thisWeek: 0,
          thisMonth: 0,
        },
        completedNodes: completedNodes.map((node) => ({
          nodeId: node.nodeId,
          timestamp: node.timestamp,
        })),
      };

      totalCompletedNodes += completedCount;
      totalNodes += totalNodesInRoadmap;
    });

    // Calculate recent activity per roadmap
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    user.roadmapProgress?.forEach((roadmapProgress) => {
      const roadmapId = roadmapProgress.roadmapId;
      if (roadmapStats[roadmapId]) {
        const weeklyNodes = roadmapProgress.completedNodes.filter(
          (node) => node.completed && new Date(node.timestamp) > weekAgo
        ).length;

        const monthlyNodes = roadmapProgress.completedNodes.filter(
          (node) => node.completed && new Date(node.timestamp) > monthAgo
        ).length;

        roadmapStats[roadmapId].recentActivity.thisWeek = weeklyNodes;
        roadmapStats[roadmapId].recentActivity.thisMonth = monthlyNodes;
      }
    });

    // Convert to array and sort by completion rate
    const roadmapStatsArray = Object.values(roadmapStats).sort(
      (a, b) => parseFloat(b.completionRate) - parseFloat(a.completionRate)
    );

    // Calculate overall completion rate
    const overallCompletionRate =
      totalNodes > 0 ? (totalCompletedNodes / totalNodes) * 100 : 0;

    // Enhanced learning streak calculation
    const allCompletedNodes = [];
    user.roadmapProgress?.forEach((roadmapProgress) => {
      roadmapProgress.completedNodes.forEach((node) => {
        if (node.completed && node.timestamp) {
          allCompletedNodes.push({
            timestamp: node.timestamp,
            roadmapId: roadmapProgress.roadmapId,
            nodeId: node.nodeId,
          });
        }
      });
    });

    const sortedProgress = allCompletedNodes.sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );

    // Calculate current learning streak
    let currentStreak = 0;
    const uniqueDates = [
      ...new Set(
        sortedProgress.map(
          (p) => new Date(p.timestamp).toISOString().split("T")[0]
        )
      ),
    ]
      .sort()
      .reverse();

    if (uniqueDates.length > 0) {
      let checkDate = new Date();
      for (let i = 0; i < uniqueDates.length; i++) {
        const currentDateStr = checkDate.toISOString().split("T")[0];
        if (uniqueDates.includes(currentDateStr)) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    // Find most active roadmap
    const mostActiveRoadmap = roadmapStatsArray.reduce((most, current) => {
      const currentTotal = current.recentActivity.thisMonth;
      const mostTotal = most ? most.recentActivity.thisMonth : 0;
      return currentTotal > mostTotal ? current : most;
    }, null);

    // Calculate total recent activity
    const totalWeeklyProgress = roadmapStatsArray.reduce(
      (sum, roadmap) => sum + roadmap.recentActivity.thisWeek,
      0
    );
    const totalMonthlyProgress = roadmapStatsArray.reduce(
      (sum, roadmap) => sum + roadmap.recentActivity.thisMonth,
      0
    );

    // Enhanced insights with comprehensive data
    const insights = {
      // Overall progress summary
      totalProgress: {
        completed: totalCompletedNodes,
        total: totalNodes,
        percentage: Math.round(overallCompletionRate),
      },
      // Detailed roadmap progress
      roadmapProgress: roadmapStatsArray,
      // Enhanced streak information
      streak: {
        current: currentStreak,
        lastActivity:
          sortedProgress.length > 0 ? sortedProgress[0].timestamp : null,
        uniqueActiveDays: uniqueDates.length,
        averageNodesPerDay:
          uniqueDates.length > 0
            ? (totalCompletedNodes / uniqueDates.length).toFixed(1)
            : 0,
      },
      // Comprehensive activity summary
      activity: {
        thisWeek: totalWeeklyProgress,
        thisMonth: totalMonthlyProgress,
        mostActiveRoadmap: mostActiveRoadmap
          ? {
              id: mostActiveRoadmap.roadmapId,
              activity: mostActiveRoadmap.recentActivity.thisMonth,
              completionRate: mostActiveRoadmap.completionRate,
            }
          : null,
        roadmapActivity: roadmapStatsArray.map((roadmap) => ({
          roadmapId: roadmap.roadmapId,
          thisWeek: roadmap.recentActivity.thisWeek,
          thisMonth: roadmap.recentActivity.thisMonth,
          completionRate: roadmap.completionRate,
        })),
        recentCompletions: sortedProgress.slice(0, 10).map((p) => ({
          nodeId: p.nodeId,
          roadmapId: p.roadmapId,
          timestamp: p.timestamp,
        })),
      },
      // Enhanced roadmaps summary
      roadmaps: {
        bookmarked: user.bookmarkedRoadmaps?.length || 0,
        following: user.followedRoadmaps?.length || 0,
        aiGenerated: user.aiGeneratedRoadmaps?.length || 0,
        activeRoadmaps: roadmapStatsArray.length,
        bookmarkedWithProgress:
          user.bookmarkedRoadmaps?.filter((id) => roadmapStats[id]).length || 0,
        bookmarkedWithoutProgress:
          user.bookmarkedRoadmaps?.filter((id) => !roadmapStats[id]).length ||
          0,
      },
      // Enhanced career insights
      career: {
        pathsSaved: user.savedCareerPaths?.length || 0,
        latestGoal:
          user.savedCareerPaths?.length > 0
            ? user.savedCareerPaths[user.savedCareerPaths.length - 1].inputs
                ?.careerGoal
            : null,
        aiSuggestionsSaved: user.savedAISuggestions?.length || 0,
      },
      // Usage analytics
      usage: {
        roadmapGeneration: user.checkRoadmapUsage(),
        chatbot: user.checkChatbotUsage(),
        aiSuggestions: user.checkAISuggestionsUsage(),
        careerTrack: user.checkCareerTrackUsage(),
      },
      recommendations: [],
    };

    // Generate enhanced recommendations based on comprehensive data
    if (overallCompletionRate < 20) {
      insights.recommendations.push(
        "Focus on completing smaller milestones to build momentum in your learning journey"
      );
    } else if (overallCompletionRate > 80) {
      insights.recommendations.push(
        "Excellent progress! Consider exploring advanced topics or new domains"
      );
    }

    if (currentStreak === 0) {
      insights.recommendations.push(
        "Restart your learning streak - even 10 minutes daily can make a big difference"
      );
    } else if (currentStreak > 7) {
      insights.recommendations.push(
        `Outstanding ${currentStreak}-day streak! Your consistency is paying off`
      );
    }

    if (totalWeeklyProgress === 0 && totalCompletedNodes > 0) {
      insights.recommendations.push(
        "You haven't made progress this week. Consider setting aside time for learning"
      );
    }

    // Roadmap-specific recommendations
    const stagnantRoadmaps = roadmapStatsArray.filter(
      (roadmap) =>
        roadmap.recentActivity.thisMonth === 0 &&
        parseFloat(roadmap.completionRate) > 0 &&
        parseFloat(roadmap.completionRate) < 100
    );

    if (stagnantRoadmaps.length > 0) {
      const roadmap = stagnantRoadmaps[0];
      insights.recommendations.push(
        `Resume progress on "${roadmap.roadmapId}" - you're ${roadmap.completionRate}% complete and close to a milestone`
      );
    }

    const nearCompletionRoadmaps = roadmapStatsArray.filter(
      (roadmap) =>
        parseFloat(roadmap.completionRate) > 80 &&
        parseFloat(roadmap.completionRate) < 100
    );

    if (nearCompletionRoadmaps.length > 0) {
      const roadmap = nearCompletionRoadmaps[0];
      insights.recommendations.push(
        `You're ${roadmap.completionRate}% done with "${roadmap.roadmapId}" - finish strong to complete it!`
      );
    }

    // Bookmark recommendations
    if (insights.roadmaps.bookmarkedWithoutProgress > 0) {
      insights.recommendations.push(
        `You have ${insights.roadmaps.bookmarkedWithoutProgress} bookmarked roadmaps you haven't started yet`
      );
    }

    res.json({
      success: true,
      insights,
    });
  } catch (error) {
    console.error("Error getting insights:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate insights",
      code: "INSIGHTS_ERROR",
    });
  }
});

// Get suggested next steps based on user progress
// Enhanced suggestions endpoint with comprehensive user profile analysis
router.get("/suggestions", auth, async (req, res) => {
  try {
    const user = req.user;
    const suggestions = [];

    // === ROADMAP PROGRESS ANALYSIS ===
    const roadmapStats = {};
    let totalCompletedNodes = 0;
    let totalNodes = 0;

    // Process roadmap progress data properly
    user.roadmapProgress?.forEach((roadmapProgress) => {
      const roadmapId = roadmapProgress.roadmapId;
      const completedNodes = roadmapProgress.completedNodes.filter(
        (node) => node.completed
      );
      const totalNodesInRoadmap = roadmapProgress.totalNodes || 0;
      const completedCount = completedNodes.length;

      roadmapStats[roadmapId] = {
        roadmapId,
        completed: completedCount,
        total: totalNodesInRoadmap,
        completionRate:
          totalNodesInRoadmap > 0
            ? (completedCount / totalNodesInRoadmap) * 100
            : 0,
        lastUpdated: roadmapProgress.lastUpdated,
        recentCompletions: completedNodes
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          .slice(0, 3),
      };

      totalCompletedNodes += completedCount;
      totalNodes += totalNodesInRoadmap;
    });

    // === ACTIVITY ANALYSIS ===
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Calculate recent activity per roadmap
    Object.values(roadmapStats).forEach((roadmap) => {
      roadmap.recentActivity = {
        thisWeek: roadmap.recentCompletions.filter(
          (comp) => new Date(comp.timestamp) > weekAgo
        ).length,
        thisMonth: roadmap.recentCompletions.filter(
          (comp) => new Date(comp.timestamp) > monthAgo
        ).length,
      };
    });

    // === PRIORITY SUGGESTIONS BASED ON PROGRESS ===

    // 1. High Priority: Near completion roadmaps (80%+ complete)
    const nearCompletionRoadmaps = Object.values(roadmapStats)
      .filter(
        (roadmap) =>
          roadmap.completionRate >= 80 && roadmap.completionRate < 100
      )
      .sort((a, b) => b.completionRate - a.completionRate);

    nearCompletionRoadmaps.forEach((roadmap) => {
      const remainingNodes = roadmap.total - roadmap.completed;
      suggestions.push({
        type: "finish_roadmap",
        roadmapId: roadmap.roadmapId,
        title: `Finish ${roadmap.roadmapId} Roadmap`,
        description: `You're ${roadmap.completionRate.toFixed(
          1
        )}% complete! Only ${remainingNodes} nodes left to finish.`,
        priority: "high",
        stats: {
          completed: roadmap.completed,
          total: roadmap.total,
          remaining: remainingNodes,
        },
        urgency: roadmap.completionRate >= 90 ? "urgent" : "high",
      });
    });

    // 2. Medium Priority: Active roadmaps with recent progress (50-80% complete)
    const activeRoadmaps = Object.values(roadmapStats)
      .filter(
        (roadmap) =>
          roadmap.completionRate >= 20 &&
          roadmap.completionRate < 80 &&
          roadmap.recentActivity.thisMonth > 0
      )
      .sort((a, b) => b.recentActivity.thisMonth - a.recentActivity.thisMonth);

    activeRoadmaps.slice(0, 2).forEach((roadmap) => {
      suggestions.push({
        type: "continue_active",
        roadmapId: roadmap.roadmapId,
        title: `Continue ${roadmap.roadmapId} Progress`,
        description: `Great momentum! You've completed ${roadmap.recentActivity.thisMonth} nodes this month. Keep going!`,
        priority: "medium",
        stats: {
          completed: roadmap.completed,
          total: roadmap.total,
          completionRate: roadmap.completionRate.toFixed(1),
          recentProgress: roadmap.recentActivity.thisMonth,
        },
      });
    });

    // 3. Revival Suggestions: Stagnant roadmaps with good progress but no recent activity
    const stagnantRoadmaps = Object.values(roadmapStats)
      .filter(
        (roadmap) =>
          roadmap.completionRate >= 20 &&
          roadmap.completionRate < 100 &&
          roadmap.recentActivity.thisMonth === 0
      )
      .sort((a, b) => b.completionRate - a.completionRate);

    stagnantRoadmaps.slice(0, 2).forEach((roadmap) => {
      const daysSinceUpdate = Math.floor(
        (now - new Date(roadmap.lastUpdated)) / (1000 * 60 * 60 * 24)
      );

      suggestions.push({
        type: "revive_roadmap",
        roadmapId: roadmap.roadmapId,
        title: `Revive ${roadmap.roadmapId} Learning`,
        description: `You made good progress (${roadmap.completionRate.toFixed(
          1
        )}% complete) but haven't updated in ${daysSinceUpdate} days. Time to get back on track!`,
        priority: roadmap.completionRate > 50 ? "medium" : "low",
        stats: {
          completed: roadmap.completed,
          total: roadmap.total,
          completionRate: roadmap.completionRate.toFixed(1),
          daysSinceUpdate,
        },
      });
    });

    // === BOOKMARKED ROADMAPS ANALYSIS ===
    const bookmarkedRoadmaps = user.bookmarkedRoadmaps || [];

    // Started bookmarked roadmaps with low progress
    const bookmarkedWithLowProgress = bookmarkedRoadmaps
      .filter(
        (roadmapId) =>
          roadmapStats[roadmapId] && roadmapStats[roadmapId].completionRate < 20
      )
      .slice(0, 2);

    bookmarkedWithLowProgress.forEach((roadmapId) => {
      const roadmap = roadmapStats[roadmapId];
      suggestions.push({
        type: "bookmarked_low_progress",
        roadmapId,
        title: `Start ${roadmapId} Properly`,
        description: `You bookmarked this but only completed ${roadmap.completed} nodes. Give it a proper start!`,
        priority: "medium",
        stats: {
          completed: roadmap.completed,
          total: roadmap.total,
          completionRate: roadmap.completionRate.toFixed(1),
        },
      });
    });

    // Untouched bookmarked roadmaps
    const untouchedBookmarks = bookmarkedRoadmaps
      .filter((roadmapId) => !roadmapStats[roadmapId])
      .slice(0, 3);

    untouchedBookmarks.forEach((roadmapId) => {
      suggestions.push({
        type: "start_bookmarked",
        roadmapId,
        title: `Start ${roadmapId} Roadmap`,
        description:
          "You bookmarked this roadmap but haven't started yet. Ready to begin your learning journey?",
        priority: "low",
        stats: {
          completed: 0,
          total: "Unknown",
          completionRate: 0,
        },
      });
    });

    // === CAREER-ALIGNED SUGGESTIONS ===
    if (user.savedCareerPaths?.length > 0) {
      const latestCareerPath =
        user.savedCareerPaths[user.savedCareerPaths.length - 1];
      const careerGoal = latestCareerPath.inputs?.careerGoal;
      const currentSkills = latestCareerPath.inputs?.currentSkills || [];
      const careerStage = latestCareerPath.inputs?.careerStage;
      const goalTimeframe = latestCareerPath.inputs?.goalTimeframe;

      suggestions.push({
        type: "career_aligned",
        title: `Skills for ${careerGoal || "Your Career Goal"}`,
        description: `Focus on roadmaps that align with your ${careerGoal}  goal in the ${careerStage} stage. Target completion within ${
          goalTimeframe || "your timeframe"
        }.`,
        priority: "high",
        careerInfo: {
          goal: careerGoal,
          stage: careerStage,
          timeframe: goalTimeframe,
          currentSkills,
          skillsCount: currentSkills.length,
        },
      });

      // Suggest roadmaps based on missing skills for career goal
      if (careerGoal && currentSkills.length > 0) {
        // This would be enhanced with actual skill-to-roadmap mapping
        suggestions.push({
          type: "skill_gap",
          title: "Fill Skill Gaps",
          description: `Based on your ${careerGoal} goal, consider strengthening areas not covered in your current skills: ${currentSkills.join(
            ", "
          )}`,
          priority: "medium",
          careerInfo: {
            goal: careerGoal,
            currentSkills,
          },
        });
      }
    }

    // === LEARNING STREAK SUGGESTIONS ===
    const allCompletedNodes = [];
    user.roadmapProgress?.forEach((roadmapProgress) => {
      roadmapProgress.completedNodes.forEach((node) => {
        if (node.completed && node.timestamp) {
          allCompletedNodes.push({
            timestamp: node.timestamp,
            roadmapId: roadmapProgress.roadmapId,
          });
        }
      });
    });

    // Calculate streak
    const uniqueDates = [
      ...new Set(
        allCompletedNodes.map(
          (p) => new Date(p.timestamp).toISOString().split("T")[0]
        )
      ),
    ]
      .sort()
      .reverse();

    let currentStreak = 0;
    if (uniqueDates.length > 0) {
      let checkDate = new Date();
      for (let i = 0; i < uniqueDates.length; i++) {
        const currentDateStr = checkDate.toISOString().split("T")[0];
        if (uniqueDates.includes(currentDateStr)) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    // Streak-based suggestions
    if (currentStreak === 0 && allCompletedNodes.length > 0) {
      const lastActivity = allCompletedNodes.sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      )[0];

      const daysSinceActivity = Math.floor(
        (now - new Date(lastActivity.timestamp)) / (1000 * 60 * 60 * 24)
      );

      suggestions.push({
        type: "restart_streak",
        title: "Restart Your Learning Streak",
        description: `You had a good learning rhythm before! Your last activity was ${daysSinceActivity} days ago. Start a new streak today.`,
        priority: "medium",
        streakInfo: {
          currentStreak: 0,
          daysSinceActivity,
          lastRoadmap: lastActivity.roadmapId,
        },
      });
    } else if (currentStreak >= 3) {
      suggestions.push({
        type: "maintain_streak",
        title: `Maintain Your ${currentStreak}-Day Streak!`,
        description: `Excellent consistency! Keep your learning momentum going with any roadmap.`,
        priority: "high",
        streakInfo: {
          currentStreak,
          encouragement: currentStreak >= 7 ? "Outstanding!" : "Great work!",
        },
      });
    }

    // === AI CONTENT SUGGESTIONS ===
    const aiGeneratedRoadmaps = user.aiGeneratedRoadmaps || [];
    const recentAIRoadmaps = aiGeneratedRoadmaps
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 3);

    if (recentAIRoadmaps.length > 0) {
      const unusedAIRoadmaps = recentAIRoadmaps.filter(
        (aiRoadmap) => !roadmapStats[aiRoadmap.title]
      );

      unusedAIRoadmaps.slice(0, 2).forEach((aiRoadmap) => {
        suggestions.push({
          type: "use_ai_roadmap",
          roadmapId: aiRoadmap.title,
          title: `Start Your AI-Generated Roadmap`,
          description: `You created "${aiRoadmap.title}" but haven't started it yet. Put your custom roadmap to use!`,
          priority: "medium",
          aiInfo: {
            title: aiRoadmap.title,
            createdAt: aiRoadmap.createdAt,
          },
        });
      });
    }

    // === USAGE-BASED SUGGESTIONS ===
    const usageStats = {
      roadmapGeneration: user.checkRoadmapUsage(),
      chatbot: user.checkChatbotUsage(),
      aiSuggestions: user.checkAISuggestionsUsage(),
      careerTrack: user.checkCareerTrackUsage(),
    };

    // Suggest using available AI features
    if (
      usageStats.aiSuggestions.remainingCount > 0 &&
      Object.keys(roadmapStats).length > 0
    ) {
      suggestions.push({
        type: "use_ai_suggestions",
        title: "Get AI Learning Suggestions",
        description: `You have ${usageStats.aiSuggestions.remainingCount} AI suggestions remaining today. Get personalized recommendations!`,
        priority: "low",
        usageInfo: {
          remaining: usageStats.aiSuggestions.remainingCount,
          total: 3,
        },
      });
    }

    if (
      usageStats.careerTrack.remainingCount > 0 &&
      (!user.savedCareerPaths || user.savedCareerPaths.length === 0)
    ) {
      suggestions.push({
        type: "create_career_path",
        title: "Create Your Career Path",
        description:
          "Plan your learning journey with a personalized career path. Define your goals and get structured guidance.",
        priority: "medium",
        usageInfo: {
          remaining: usageStats.careerTrack.remainingCount,
          total: 3,
        },
      });
    }

    // Replace this section in your suggestions endpoint (around line 580-595)

    // === OVERALL PROGRESS SUGGESTIONS ===
    const overallCompletionRate =
      totalNodes > 0 ? (totalCompletedNodes / totalNodes) * 100 : 0;

    // Count roadmaps with low progression (less than 20% complete)
    const lowProgressRoadmaps = Object.values(roadmapStats).filter(
      (roadmap) => roadmap.completionRate < 20
    );

    // Only show build momentum suggestion if user has 3+ roadmaps with low progression
    if (lowProgressRoadmaps.length >= 3 && overallCompletionRate < 10) {
      suggestions.push({
        type: "build_momentum",
        title: "Build Learning Momentum",
        description: `You've started ${
          Object.keys(roadmapStats).length
        } roadmaps but have ${
          lowProgressRoadmaps.length
        } roadmaps with less than 20% completion. Focus on one roadmap to build momentum.`,
        priority: "high",
        progressInfo: {
          totalRoadmaps: Object.keys(roadmapStats).length,
          lowProgressRoadmaps: lowProgressRoadmaps.length,
          overallCompletion: overallCompletionRate.toFixed(1),
          totalNodes: totalCompletedNodes,
        },
      });
    }

    // === SORT AND PRIORITIZE SUGGESTIONS ===
    const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
    suggestions.sort((a, b) => {
      const aPriority = priorityOrder[a.urgency || a.priority] || 0;
      const bPriority = priorityOrder[b.urgency || b.priority] || 0;
      return bPriority - aPriority;
    });

    // === RESPONSE WITH ENHANCED METADATA ===
    const response = {
      success: true,
      suggestions: suggestions.slice(0, 8), // Top 8 suggestions
      metadata: {
        totalSuggestions: suggestions.length,
        priorityBreakdown: {
          urgent: suggestions.filter((s) => s.urgency === "urgent").length,
          high: suggestions.filter((s) => s.priority === "high").length,
          medium: suggestions.filter((s) => s.priority === "medium").length,
          low: suggestions.filter((s) => s.priority === "low").length,
        },
        userStats: {
          totalRoadmaps: Object.keys(roadmapStats).length,
          totalCompletedNodes,
          totalNodes,
          overallCompletionRate: overallCompletionRate.toFixed(1),
          currentStreak,
          bookmarkedRoadmaps: bookmarkedRoadmaps.length,
          aiGeneratedRoadmaps: aiGeneratedRoadmaps.length,
          hasCareerPath: (user.savedCareerPaths?.length || 0) > 0,
        },
        usageLimits: usageStats,
        lastUpdated: new Date().toISOString(),
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Error generating enhanced suggestions:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate personalized suggestions",
      code: "SUGGESTIONS_ERROR",
      details: error.message,
    });
  }
});

// Health check endpoint
router.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "AI Mentor service is running",
    timestamp: new Date().toISOString(),
  });
});

// Export router
module.exports = router;

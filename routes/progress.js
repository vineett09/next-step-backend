const express = require("express");
const User = require("../models/User");
const dotenv = require("dotenv");
const auth = require("../middleware/auth");

dotenv.config();

const router = express.Router();

router.post("/toggle", auth, async (req, res) => {
  try {
    // Destructure totalNodes from the request body
    const { roadmapId, nodeId, totalNodes } = req.body;

    if (!roadmapId || !nodeId) {
      return res
        .status(400)
        .json({ message: "RoadmapId and nodeId are required" });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Pass totalNodes to the method
    user.toggleNodeCompletion(roadmapId, nodeId, totalNodes);

    // FIXED: Save the user after toggling
    await user.save();

    // Check if node is completed after toggle
    const isCompleted = user.hasCompletedNode(roadmapId, nodeId);

    // Get the timestamp of the node
    const roadmapProgress = user.roadmapProgress.find(
      (progress) => progress.roadmapId === roadmapId
    );

    let timestamp = new Date();
    if (roadmapProgress && isCompleted) {
      const node = roadmapProgress.completedNodes.find(
        (node) => node.nodeId === nodeId && node.completed
      );
      if (node) {
        timestamp = node.timestamp;
      }
    }

    res.json({
      success: true,
      completed: isCompleted,
      timestamp: timestamp,
    });
  } catch (error) {
    console.error("Error toggling node completion:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get all progress for a specific roadmap
router.get("/:roadmapId", auth, async (req, res) => {
  try {
    const { roadmapId } = req.params;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Use the new helper method to get completed nodes
    const completedNodes = user.getCompletedNodes(roadmapId);

    res.json(completedNodes);
  } catch (error) {
    console.error("Error fetching roadmap progress:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;

const express = require("express");
const User = require("../models/User");
const dotenv = require("dotenv");
const auth = require("../middleware/auth");

dotenv.config();

const router = express.Router();

router.post("/toggle", auth, async (req, res) => {
  const { roadmapId, nodeId } = req.body;
  if (!roadmapId || !nodeId) {
    return res
      .status(400)
      .json({ message: "RoadmapId and nodeId are required" });
  }
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: "User not found" });
  await user.toggleNodeCompletion(roadmapId, nodeId);
  const progress = user.roadmapProgress.find(
    (p) => p.roadmapId === roadmapId && p.nodeId === nodeId
  );
  res.json({
    success: true,
    completed: progress.completed,
    timestamp: progress.timestamp,
  });
});

// Get all progress for a specific roadmap
router.get("/:roadmapId", auth, async (req, res) => {
  const { roadmapId } = req.params;
  const user = await User.findById(req.user.id);
  const roadmapProgress = user.roadmapProgress
    .filter(
      (progress) => progress.roadmapId === roadmapId && progress.completed
    )
    .map((progress) => ({
      nodeId: progress.nodeId,
      timestamp: progress.timestamp,
    }));
  res.json(roadmapProgress);
});

module.exports = router;

const express = require("express");
const User = require("../models/User");
const dotenv = require("dotenv");
const auth = require("../middleware/auth");

dotenv.config();

const router = express.Router();
router.post("/bookmark-toggle", auth, async (req, res) => {
  const { roadmapId } = req.body;
  if (!roadmapId) {
    return res.status(400).json({ message: "RoadmapId is required" });
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    await user.toggleBookmark(roadmapId);
    const isBookmarked = user.isBookmarked(roadmapId);
    res.json({ success: true, bookmarked: isBookmarked });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: "Server error" });
  }
});

// Get all bookmarked roadmaps for a user
router.get("/bookmarks", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user.bookmarkedRoadmaps);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;

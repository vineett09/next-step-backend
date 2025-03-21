const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const User = require("../models/User");
const Roadmap = require("../models/CustomRoadmaps");
// @route   GET api/roadmaps/public
// @desc    Get all public roadmaps
// @access  Public
router.get("/shared-roadmaps", async (req, res) => {
  try {
    const publicRoadmaps = await Roadmap.find({ isPrivate: false })
      .select(
        "title description lastUpdated createdAt type createdBy ratingStats"
      )
      .populate("createdBy", "username")
      .sort({ lastUpdated: -1 });

    res.json({ success: true, roadmaps: publicRoadmaps });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});
// @route   GET api/roadmaps/:id/followers-count
// @desc    Get followers count for a roadmap (public access)
// @access  Public
router.get("/:id/followers-count", async (req, res) => {
  try {
    const roadmapId = req.params.id;

    const roadmap = await Roadmap.findById(roadmapId);
    if (!roadmap) {
      return res.status(404).json({
        success: false,
        message: "Roadmap not found",
      });
    }

    // If it's a private roadmap, don't expose the followers count
    if (roadmap.isPrivate) {
      return res.status(403).json({
        success: false,
        message: "Cannot access private roadmap information",
      });
    }

    res.json({
      success: true,
      followersCount: roadmap.followersCount || 0,
    });
  } catch (error) {
    console.error("Error getting followers count:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});
// @route   POST api/roadmaps/:id/rating
// @desc    Rate a roadmap
// @access  Private
router.post("/:id/rating", auth, async (req, res) => {
  try {
    const { rating } = req.body;
    const userId = req.user.id;

    // Validate rating
    const ratingValue = parseInt(rating);
    if (isNaN(ratingValue) || ratingValue < 1 || ratingValue > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be a number between 1 and 5",
      });
    }

    const roadmap = await Roadmap.findById(req.params.id);
    if (!roadmap) {
      return res.status(404).json({
        success: false,
        message: "Roadmap not found",
      });
    }

    if (roadmap.isPrivate) {
      return res.status(403).json({
        success: false,
        message: "Cannot rate private roadmaps",
      });
    }

    if (roadmap.createdBy.toString() === userId) {
      return res.status(403).json({
        success: false,
        message: "You cannot rate your own roadmap",
      });
    }

    const existingRatingIndex = roadmap.ratings.findIndex(
      (r) => r.userId.toString() === userId
    );

    if (existingRatingIndex !== -1) {
      roadmap.ratings[existingRatingIndex].value = ratingValue;
      roadmap.ratings[existingRatingIndex].timestamp = Date.now();
    } else {
      roadmap.ratings.push({
        userId,
        value: ratingValue,
        timestamp: Date.now(),
      });
    }

    await roadmap.save();

    res.json({
      success: true,
      message: "Rating submitted successfully",
      averageRating: roadmap.ratingStats.averageRating,
      ratingCount: roadmap.ratingStats.ratingCount,
    });
  } catch (error) {
    console.error("Error submitting rating:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// @route   GET api/roadmaps/:id/rating
// @desc    Get user's rating for a roadmap
// @access  Private
router.get("/:id/rating", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const roadmap = await Roadmap.findById(req.params.id);

    if (!roadmap) {
      return res.status(404).json({
        success: false,
        message: "Roadmap not found",
      });
    }

    const userRating = roadmap.ratings.find(
      (r) => r.userId.toString() === userId
    );

    res.json({
      success: true,
      userRating: userRating ? userRating.value : null,
      averageRating: roadmap.ratingStats.averageRating,
      ratingCount: roadmap.ratingStats.ratingCount,
    });
  } catch (error) {
    console.error("Error getting rating:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});
// @route   GET api/roadmaps/public/:id
// @desc    Get a specific public roadmap
// @access  Public
router.get("/public/:id", async (req, res) => {
  try {
    const roadmap = await Roadmap.findOne({
      _id: req.params.id,
      isPrivate: false,
    })
      .select(
        "title description structure settings lastUpdated createdAt type createdBy ratingStats"
      )
      .populate("createdBy", "username");

    if (!roadmap) {
      return res.status(404).json({
        success: false,
        message: "Public roadmap not found or is private",
      });
    }

    res.json({
      success: true,
      roadmap,
    });
  } catch (error) {
    console.error("Error fetching public roadmap:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});
// @route   POST api/roadmaps/custom
// @desc    Create a custom roadmap
// @access  Private
router.post("/custom-roadmap", auth, async (req, res) => {
  try {
    const { title, description, structure, settings } = req.body;

    if (!title || !structure) {
      return res
        .status(400)
        .json({ success: false, message: "Required fields missing" });
    }

    let roadmap = await Roadmap.findOne({
      title: title,
      createdBy: req.user.id,
    });

    if (roadmap) {
      roadmap.description = description;
      roadmap.structure = structure;
      roadmap.settings = settings;
      roadmap.lastUpdated = Date.now();
    } else {
      roadmap = new Roadmap({
        title,
        description,
        structure,
        settings,
        createdBy: req.user.id,
        type: "custom",
      });
    }

    await roadmap.save();

    return res.status(200).json({
      success: true,
      message: "Roadmap saved successfully",
      roadmapId: roadmap._id,
    });
  } catch (error) {
    console.error("Error saving roadmap:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// @route   PUT api/roadmaps/:id
// @desc    Update an existing roadmap
// @access  Private
router.put("/:id", auth, async (req, res) => {
  try {
    const { title, description, structure, settings } = req.body;

    let roadmap = await Roadmap.findById(req.params.id);

    if (!roadmap) {
      return res
        .status(404)
        .json({ success: false, message: "Roadmap not found" });
    }

    if (roadmap.createdBy.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Not authorized to update this roadmap",
      });
    }

    roadmap.title = title || roadmap.title;
    roadmap.description = description || roadmap.description;
    roadmap.structure = structure || roadmap.structure;
    roadmap.settings = settings || roadmap.settings;
    roadmap.lastUpdated = Date.now();

    await roadmap.save();

    return res.status(200).json({
      success: true,
      message: "Roadmap updated successfully",
      roadmap,
    });
  } catch (error) {
    console.error("Error updating roadmap:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});
// @route   GET api/roadmaps/user
// @desc    Get all roadmaps created by the user
// @access  Private
router.get("/user", auth, async (req, res) => {
  try {
    const roadmaps = await Roadmap.find({ createdBy: req.user.id })
      .select("title description lastUpdated createdAt type isPrivate")
      .sort({ lastUpdated: -1 });

    res.json({ success: true, roadmaps });
  } catch (error) {
    console.error("Error fetching user roadmaps:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// @route   GET api/roadmaps/:id
// @desc    Get a specific roadmap
// @access  Private (for private roadmaps)
router.get("/:id", auth, async (req, res) => {
  try {
    const roadmap = await Roadmap.findById(req.params.id);

    if (!roadmap) {
      return res
        .status(404)
        .json({ success: false, message: "Roadmap not found" });
    }

    if (roadmap.isPrivate) {
      if (!req.user || req.user.id !== roadmap.createdBy.toString()) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to view this roadmap",
        });
      }
    }

    res.json({ success: true, roadmap });
  } catch (error) {
    console.error("Error fetching roadmap:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// @route   DELETE api/roadmaps/:id
// @desc    Delete a roadmap
// @access  Private
router.delete("/:id", auth, async (req, res) => {
  try {
    const roadmap = await Roadmap.findById(req.params.id);

    if (!roadmap) {
      return res
        .status(404)
        .json({ success: false, message: "Roadmap not found" });
    }

    if (roadmap.createdBy.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Not authorized to delete this roadmap",
      });
    }

    await Roadmap.deleteOne({ _id: req.params.id });

    res.json({ success: true, message: "Roadmap deleted" });
  } catch (error) {
    console.error("Error deleting roadmap:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// @route   PUT api/roadmaps/:id/visibility
// @desc    Toggle roadmap privacy
// @access  Private
router.put("/:id/visibility", auth, async (req, res) => {
  try {
    const roadmap = await Roadmap.findById(req.params.id);

    if (!roadmap) {
      return res
        .status(404)
        .json({ success: false, message: "Roadmap not found" });
    }

    if (roadmap.createdBy.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Not authorized to modify this roadmap",
      });
    }

    roadmap.isPrivate = !roadmap.isPrivate;
    await roadmap.save();

    res.json({
      success: true,
      message: `Roadmap is now ${roadmap.isPrivate ? "private" : "public"}`,
      isPrivate: roadmap.isPrivate,
    });
  } catch (error) {
    console.error("Error toggling roadmap visibility:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});
// @route   POST api/roadmaps/:id/follow
// @desc    Follow/unfollow a roadmap
// @access  Private
router.post("/:id/follow", auth, async (req, res) => {
  try {
    const roadmapId = req.params.id;
    const userId = req.user.id;

    // Get the roadmap
    const roadmap = await Roadmap.findById(roadmapId);
    if (!roadmap) {
      return res.status(404).json({
        success: false,
        message: "Roadmap not found",
      });
    }

    // Get the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Toggle follow status
    const result = user.toggleFollowRoadmap(roadmapId);
    await user.save();

    // Update followers count on roadmap
    if (result.action === "followed") {
      roadmap.followersCount++;
    } else {
      if (roadmap.followersCount > 0) {
        roadmap.followersCount--;
      }
    }
    await roadmap.save();

    return res.json({
      success: true,
      following: result.action === "followed",
      followersCount: roadmap.followersCount,
      message: `Roadmap ${result.action} successfully`,
    });
  } catch (error) {
    console.error("Error following roadmap:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// @route   GET api/roadmaps/:id/follow-status
// @desc    Get follow status for a roadmap
// @access  Private
router.get("/:id/follow-status", auth, async (req, res) => {
  try {
    const roadmapId = req.params.id;
    const userId = req.user.id;

    const roadmap = await Roadmap.findById(roadmapId);
    if (!roadmap) {
      return res.status(404).json({
        success: false,
        message: "Roadmap not found",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const following = user.isFollowingRoadmap(roadmapId);

    res.json({
      success: true,
      following,
      followersCount: roadmap.followersCount,
    });
  } catch (error) {
    console.error("Error getting follow status:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});
module.exports = router;

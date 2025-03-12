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
      .select("title description lastUpdated createdAt type createdBy")
      .populate("createdBy", "username")
      .sort({ lastUpdated: -1 });

    res.json({ success: true, roadmaps: publicRoadmaps });
  } catch (error) {
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
        "title description structure settings lastUpdated createdAt type createdBy"
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

    // Validate input
    if (!title || !structure) {
      return res
        .status(400)
        .json({ success: false, message: "Required fields missing" });
    }

    // Create a new roadmap or update existing one
    let roadmap = await Roadmap.findOne({
      title: title,
      createdBy: req.user.id,
    });

    if (roadmap) {
      // Update existing roadmap
      roadmap.description = description;
      roadmap.structure = structure;
      roadmap.settings = settings;
      roadmap.lastUpdated = Date.now();
    } else {
      // Create new roadmap
      roadmap = new Roadmap({
        title,
        description,
        structure,
        settings,
        createdBy: req.user.id,
        type: "custom", // Indicates a user-created roadmap
      });
    }

    await roadmap.save();

    // Return success with roadmap id
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
// In your router file (e.g., roadmaps.js)

// @route   PUT api/roadmaps/:id
// @desc    Update an existing roadmap
// @access  Private
router.put("/:id", auth, async (req, res) => {
  try {
    const { title, description, structure, settings } = req.body;

    // Find the roadmap by ID
    let roadmap = await Roadmap.findById(req.params.id);

    if (!roadmap) {
      return res
        .status(404)
        .json({ success: false, message: "Roadmap not found" });
    }

    // Check ownership
    if (roadmap.createdBy.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Not authorized to update this roadmap",
      });
    }

    // Update fields
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

    // If this is a private roadmap, check permissions
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

    // Check ownership
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

    // Check ownership
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

module.exports = router;

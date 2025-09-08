const express = require("express");
const router = express.Router();
const { Roadmap } = require("../models/roadmapSchemas"); // Adjust path as needed
const mongoose = require("mongoose");
// GET /api/mainRoadmaps/:roadmapId - Fetch roadmap by ID, slug, or name
router.get("/:roadmapId", async (req, res) => {
  try {
    const { roadmapId } = req.params;
    let roadmap = null;

    // First, try to find by slug (most reliable)
    roadmap = await Roadmap.findOne({ slug: roadmapId });

    // If not found by slug, check if roadmapId is a valid ObjectId
    if (!roadmap && mongoose.Types.ObjectId.isValid(roadmapId)) {
      roadmap = await Roadmap.findById(roadmapId);
    }

    // If still not found, try name-based search (fallback for existing data)
    if (!roadmap) {
      const roadmapName = roadmapId
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      const searchPatterns = [
        `${roadmapName} Developer Roadmap for Beginners to Advanced 2025`,
        `${roadmapName} Developer Roadmap 2025`,
        `${roadmapName} Roadmap 2025`,
        `${roadmapName} Developer`,
        roadmapName,
      ];

      for (const pattern of searchPatterns) {
        roadmap = await Roadmap.findOne({
          name: {
            $regex: new RegExp(
              `^${pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
              "i"
            ),
          },
        });
        if (roadmap) break;
      }
    }

    if (!roadmap) {
      return res.status(404).json({
        success: false,
        message: "Roadmap not found",
        requestedId: roadmapId,
      });
    }

    res.json({
      success: true,
      data: {
        name: roadmap.name,
        children: roadmap.children,
      },
    });
  } catch (error) {
    console.error("Error fetching roadmap:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

module.exports = router;

const mongoose = require("mongoose");

const RoadmapSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: false,
      default: "",
    },
    structure: {
      nodes: {
        type: [mongoose.Schema.Types.Mixed],
        default: [],
      },
      edges: {
        type: [mongoose.Schema.Types.Mixed],
        default: [],
      },
    },
    settings: {
      palette: {
        primary: String,
        secondary: String,
        connection: String,
        text: String,
      },
      background: {
        variant: String,
        color: String,
        gap: Number,
        size: Number,
      },
    },
    type: {
      type: String,
      enum: ["custom", "template", "official"],
      default: "custom",
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Add text index for search functionality
RoadmapSchema.index({ title: "text", description: "text" });

module.exports = mongoose.model("CustomRoadmap", RoadmapSchema);

const mongoose = require("mongoose");

// Schema for individual roadmap nodes (recursive structure)
const roadmapNodeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    preferred: {
      type: Boolean,
      default: false,
    },
    dividerText: {
      type: String,
    },
    children: [
      {
        type: mongoose.Schema.Types.Mixed, // Allows recursive nesting
      },
    ],
  },
  { _id: false }
);

// Main roadmap schema
const roadmapSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    children: [roadmapNodeSchema],
  },
  {
    timestamps: true,
  }
);

// Pre-save middleware to generate slug if not provided
roadmapSchema.pre("save", function (next) {
  if (!this.slug && this.name) {
    // Generate slug from name
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "") // Remove special characters
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/-+/g, "-") // Replace multiple hyphens with single
      .trim("-"); // Remove leading/trailing hyphens
  }
  next();
});

// Create models
const Roadmap = mongoose.model("Roadmap", roadmapSchema);

module.exports = { Roadmap };

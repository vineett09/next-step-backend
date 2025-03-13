const mongoose = require("mongoose");

// Add a schema for individual ratings
const RatingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  value: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

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
    // Add ratings field to store user ratings
    ratings: {
      type: [RatingSchema],
      default: [],
    },
    // Add computed fields for quick access to rating stats
    ratingStats: {
      averageRating: {
        type: Number,
        default: 0,
      },
      ratingCount: {
        type: Number,
        default: 0,
      },
    },
    type: {
      type: String,
      enum: ["custom", "template", "official"],
      default: "custom",
    },
    isPrivate: {
      type: Boolean,
      default: true,
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

// Add method to update rating statistics
RoadmapSchema.methods.updateRatingStats = function () {
  const ratings = this.ratings || [];
  if (ratings.length === 0) {
    this.ratingStats = { averageRating: 0, ratingCount: 0 };
    return;
  }

  const sum = ratings.reduce((total, rating) => total + rating.value, 0);
  this.ratingStats = {
    averageRating: parseFloat((sum / ratings.length).toFixed(1)),
    ratingCount: ratings.length,
  };
};

// Pre-save middleware to update rating stats before saving
RoadmapSchema.pre("save", function (next) {
  if (this.isModified("ratings")) {
    this.updateRatingStats();
  }
  next();
});

module.exports = mongoose.model("CustomRoadmap", RoadmapSchema);

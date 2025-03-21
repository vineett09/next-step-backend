const mongoose = require("mongoose");

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
    },
    ratings: {
      type: [RatingSchema],
      default: [],
    },
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
    followersCount: {
      type: Number,
      default: 0,
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

RoadmapSchema.index({ title: "text", description: "text" });

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

RoadmapSchema.pre("save", function (next) {
  if (this.isModified("ratings")) {
    this.updateRatingStats();
  }
  next();
});

module.exports = mongoose.model("CustomRoadmap", RoadmapSchema);

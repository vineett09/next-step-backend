const mongoose = require("mongoose");

const ProgressSchema = new mongoose.Schema({
  roadmapId: { type: String, required: true },
  nodeId: { type: String, required: true },
  completed: { type: Boolean, default: true },
  timestamp: { type: Date, default: Date.now },
});

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    roadmapProgress: [ProgressSchema],
    bookmarkedRoadmaps: [{ type: String }],
  },
  { timestamps: true }
);

UserSchema.methods.hasCompletedNode = function (roadmapId, nodeId) {
  return this.roadmapProgress.some(
    (progress) =>
      progress.roadmapId === roadmapId &&
      progress.nodeId === nodeId &&
      progress.completed
  );
};

UserSchema.methods.toggleNodeCompletion = function (roadmapId, nodeId) {
  const existingProgress = this.roadmapProgress.find(
    (progress) => progress.roadmapId === roadmapId && progress.nodeId === nodeId
  );
  if (existingProgress) {
    existingProgress.completed = !existingProgress.completed;
    existingProgress.timestamp = Date.now();
  } else {
    this.roadmapProgress.push({ roadmapId, nodeId, completed: true });
  }
  return this.save();
};
UserSchema.methods.toggleBookmark = function (roadmapId) {
  const index = this.bookmarkedRoadmaps.indexOf(roadmapId);
  if (index > -1) {
    this.bookmarkedRoadmaps.splice(index, 1);
  } else {
    this.bookmarkedRoadmaps.push(roadmapId);
  }
  return this.save();
};

// Method to check if roadmap is bookmarked
UserSchema.methods.isBookmarked = function (roadmapId) {
  return this.bookmarkedRoadmaps.includes(roadmapId);
};
module.exports = mongoose.model("User", UserSchema);

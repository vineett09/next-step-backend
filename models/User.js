const mongoose = require("mongoose");

const ProgressSchema = new mongoose.Schema({
  roadmapId: { type: String, required: true },
  nodeId: { type: String, required: true },
  completed: { type: Boolean, default: true },
  timestamp: { type: Date, default: Date.now },
});

const RoadmapUsageSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  count: { type: Number, default: 0 },
});

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    roadmapProgress: [ProgressSchema],
    bookmarkedRoadmaps: [{ type: String }],
    roadmapUsage: [RoadmapUsageSchema],
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

// Method to check and update roadmap generation usage
UserSchema.methods.checkRoadmapUsage = function () {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayUsage = this.roadmapUsage.find(
    (usage) => new Date(usage.date).setHours(0, 0, 0, 0) === today.getTime()
  );

  if (todayUsage) {
    return {
      canGenerate: todayUsage.count < 10,
      usageCount: todayUsage.count,
      remainingCount: 10 - todayUsage.count,
    };
  } else {
    return {
      canGenerate: true,
      usageCount: 0,
      remainingCount: 10,
    };
  }
};

// Method to increment roadmap usage
UserSchema.methods.incrementRoadmapUsage = function () {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayUsageIndex = this.roadmapUsage.findIndex(
    (usage) => new Date(usage.date).setHours(0, 0, 0, 0) === today.getTime()
  );

  if (todayUsageIndex !== -1) {
    this.roadmapUsage[todayUsageIndex].count += 1;
  } else {
    this.roadmapUsage.push({ date: today, count: 1 });
  }

  return this.save();
};

module.exports = mongoose.model("User", UserSchema);

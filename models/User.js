const mongoose = require("mongoose");

const RoadmapProgressSchema = new mongoose.Schema({
  roadmapId: { type: String, required: true, unique: true },
  completedNodes: [
    {
      nodeId: { type: String, required: true },
      completed: { type: Boolean, default: true },
      timestamp: { type: Date, default: Date.now },
    },
  ],
  totalNodes: { type: Number, default: 0 }, // Add this line
  lastUpdated: { type: Date, default: Date.now },
});

const RoadmapUsageSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  count: { type: Number, default: 0 },
});

const ChatbotUsageSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  count: { type: Number, default: 0 },
});

const AISuggestionsUsageSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  count: { type: Number, default: 0 },
});

const CareerTrackUsageSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  count: { type: Number, default: 0 },
});

const AIGeneratedRoadmapSchema = new mongoose.Schema({
  roadmap: { type: Object, required: true },
  title: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const CareerPathSchema = new mongoose.Schema({
  inputs: {
    currentSkills: { type: [String], default: [] },
    careerGoal: { type: String, required: true },
    hoursPerWeek: { type: String, default: "10-20" },
    careerStage: { type: String, required: true },
    educationLevel: { type: String, required: true },
    currentlyStudying: { type: String, default: "No" },
    graduationYear: { type: String, default: "" },
    major: { type: String, default: "" },
    workExperience: { type: String, default: "" },
    previousIndustry: { type: String, default: "" },
    previousRole: { type: String, default: "" },
    currentCompany: { type: String, default: "" },
    currentRole: { type: String, default: "" },
    yearsOfExperience: { type: String, default: "" },
    internshipExperience: { type: String, default: "" },
    jobSearchStatus: { type: String, default: "" },
    currentIndustry: { type: String, default: "" },
    promotionTimeframe: { type: String, default: "" },
    switchReason: { type: String, default: "" },
    techEducation: { type: String, default: "" },
    goalTimeframe: { type: String, default: "" },
    learningPreference: { type: String, default: "" },
  },
  careerPath: [
    {
      title: { type: String, required: true },
      timeToAchieve: { type: Number, required: true },
      requiredSkills: { type: [String], required: true },
      description: { type: String, required: true },
      learningResources: { type: [String], required: true },
      aiFeedback: { type: String },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    refreshToken: { type: String },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    roadmapProgress: [RoadmapProgressSchema], // Updated to use grouped schema
    bookmarkedRoadmaps: [{ type: String }],
    roadmapUsage: [RoadmapUsageSchema],
    chatbotUsage: [ChatbotUsageSchema],
    aiSuggestionsUsage: [AISuggestionsUsageSchema],
    careerTrackUsage: [CareerTrackUsageSchema],
    followedRoadmaps: [
      { type: mongoose.Schema.Types.ObjectId, ref: "CustomRoadmap" },
    ],
    savedAISuggestions: [
      {
        answers: { type: Object },
        roadmap: { type: String },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    aiGeneratedRoadmaps: [AIGeneratedRoadmapSchema],
    savedCareerPaths: [CareerPathSchema],
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
  },
  { timestamps: true }
);

UserSchema.methods.toggleNodeCompletion = function (
  roadmapId,
  nodeId,
  totalNodes
) {
  let roadmapProgress = this.roadmapProgress.find(
    (progress) => progress.roadmapId === roadmapId
  );

  // If roadmap doesn't exist, create it
  if (!roadmapProgress) {
    roadmapProgress = {
      roadmapId: roadmapId,
      completedNodes: [],
      lastUpdated: new Date(),
    };
    this.roadmapProgress.push(roadmapProgress);
  }

  // Update totalNodes count regardless of the toggle action
  if (totalNodes !== undefined) {
    roadmapProgress.totalNodes = totalNodes;
  }

  // Find existing node in this roadmap
  const existingNode = roadmapProgress.completedNodes.find(
    (node) => node.nodeId === nodeId
  );

  if (existingNode) {
    // Toggle completion status
    existingNode.completed = !existingNode.completed;
    existingNode.timestamp = new Date();

    // If marking as incomplete, remove the node entirely
    if (!existingNode.completed) {
      roadmapProgress.completedNodes = roadmapProgress.completedNodes.filter(
        (node) => node.nodeId !== nodeId
      );
    }
  } else {
    // Add new completed node
    roadmapProgress.completedNodes.push({
      nodeId: nodeId,
      completed: true,
      timestamp: new Date(),
    });
  }

  // Update the lastUpdated timestamp
  roadmapProgress.lastUpdated = new Date();
};

// FIXED: Move hasCompletedNode method outside of toggleNodeCompletion
UserSchema.methods.hasCompletedNode = function (roadmapId, nodeId) {
  const roadmapProgress = this.roadmapProgress.find(
    (progress) => progress.roadmapId === roadmapId
  );

  if (!roadmapProgress) return false;

  return roadmapProgress.completedNodes.some(
    (node) => node.nodeId === nodeId && node.completed
  );
};

UserSchema.methods.getCompletedNodes = function (roadmapId) {
  const roadmapProgress = this.roadmapProgress.find(
    (progress) => progress.roadmapId === roadmapId
  );

  if (!roadmapProgress) return [];

  return roadmapProgress.completedNodes
    .filter((node) => node.completed)
    .map((node) => ({
      nodeId: node.nodeId,
      timestamp: node.timestamp,
    }));
};

// Helper method to get progress statistics for a roadmap
UserSchema.methods.getRoadmapStats = function (roadmapId) {
  const roadmapProgress = this.roadmapProgress.find(
    (progress) => progress.roadmapId === roadmapId
  );

  if (!roadmapProgress) {
    return {
      totalCompleted: 0,
      completedNodes: [],
      lastUpdated: null,
    };
  }

  const completedNodes = roadmapProgress.completedNodes.filter(
    (node) => node.completed
  );

  return {
    totalCompleted: completedNodes.length,
    completedNodes: completedNodes.map((node) => ({
      nodeId: node.nodeId,
      timestamp: node.timestamp,
    })),
    lastUpdated: roadmapProgress.lastUpdated,
  };
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

UserSchema.methods.isBookmarked = function (roadmapId) {
  return this.bookmarkedRoadmaps.includes(roadmapId);
};

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

UserSchema.methods.checkChatbotUsage = function () {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayUsage = this.chatbotUsage.find(
    (usage) => new Date(usage.date).setHours(0, 0, 0, 0) === today.getTime()
  );

  if (todayUsage) {
    return {
      canUse: todayUsage.count < 10,
      usageCount: todayUsage.count,
      remainingCount: 10 - todayUsage.count,
    };
  } else {
    return {
      canUse: true,
      usageCount: 0,
      remainingCount: 10,
    };
  }
};

UserSchema.methods.incrementChatbotUsage = function () {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayUsageIndex = this.chatbotUsage.findIndex(
    (usage) => new Date(usage.date).setHours(0, 0, 0, 0) === today.getTime()
  );

  if (todayUsageIndex !== -1) {
    this.chatbotUsage[todayUsageIndex].count += 1;
  } else {
    this.chatbotUsage.push({ date: today, count: 1 });
  }

  return this.save();
};

UserSchema.methods.checkAISuggestionsUsage = function () {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayUsage = this.aiSuggestionsUsage.find(
    (usage) => new Date(usage.date).setHours(0, 0, 0, 0) === today.getTime()
  );

  if (todayUsage) {
    return {
      canUse: todayUsage.count < 3,
      usageCount: todayUsage.count,
      remainingCount: 3 - todayUsage.count,
    };
  } else {
    return {
      canUse: true,
      usageCount: 0,
      remainingCount: 3,
    };
  }
};

UserSchema.methods.incrementAISuggestionsUsage = function () {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayUsageIndex = this.aiSuggestionsUsage.findIndex(
    (usage) => new Date(usage.date).setHours(0, 0, 0, 0) === today.getTime()
  );

  if (todayUsageIndex !== -1) {
    this.aiSuggestionsUsage[todayUsageIndex].count += 1;
  } else {
    this.aiSuggestionsUsage.push({ date: today, count: 1 });
  }

  return this.save();
};

UserSchema.methods.checkCareerTrackUsage = function () {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayUsage = this.careerTrackUsage.find(
    (usage) => new Date(usage.date).setHours(0, 0, 0, 0) === today.getTime()
  );

  if (todayUsage) {
    return {
      canUse: todayUsage.count < 3,
      usageCount: todayUsage.count,
      remainingCount: 3 - todayUsage.count,
    };
  } else {
    return {
      canUse: true,
      usageCount: 0,
      remainingCount: 3,
    };
  }
};

UserSchema.methods.incrementCareerTrackUsage = function () {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayUsageIndex = this.careerTrackUsage.findIndex(
    (usage) => new Date(usage.date).setHours(0, 0, 0, 0) === today.getTime()
  );

  if (todayUsageIndex !== -1) {
    this.careerTrackUsage[todayUsageIndex].count += 1;
  } else {
    this.careerTrackUsage.push({ date: today, count: 1 });
  }

  return this.save();
};

UserSchema.methods.toggleFollowRoadmap = function (roadmapId) {
  const index = this.followedRoadmaps.findIndex(
    (id) => id.toString() === roadmapId.toString()
  );

  if (index > -1) {
    this.followedRoadmaps.splice(index, 1);
    return { action: "unfollowed" };
  } else {
    this.followedRoadmaps.push(roadmapId);
    return { action: "followed" };
  }
};

UserSchema.methods.isFollowingRoadmap = function (roadmapId) {
  return this.followedRoadmaps.some(
    (id) => id.toString() === roadmapId.toString()
  );
};

module.exports = mongoose.model("User", UserSchema);

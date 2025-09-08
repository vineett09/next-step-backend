const dotenv = require("dotenv");
dotenv.config();
const mongoose = require("mongoose");
const { Roadmap } = require("../models/roadmapSchemas"); // Adjust path

const generateSlug = (name) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
};

const updateRoadmapSlugs = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const roadmaps = await Roadmap.find({});
    console.log(`Found ${roadmaps.length} roadmaps to update`);

    for (const roadmap of roadmaps) {
      if (!roadmap.slug) {
        const slug = generateSlug(roadmap.name);
        roadmap.slug = slug;
        await roadmap.save();
        console.log(`Updated "${roadmap.name}" with slug: "${slug}"`);
      } else {
        console.log(`"${roadmap.name}" already has slug: "${roadmap.slug}"`);
      }
    }

    console.log("All roadmaps updated successfully");
    process.exit(0);
  } catch (error) {
    console.error("Error updating roadmaps:", error);
    process.exit(1);
  }
};

updateRoadmapSlugs();

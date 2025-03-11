// index.js (Main Server File)
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const authRoutes = require("./routes/auth");
const bookmarkRoutes = require("./routes/bookmark");
const progressRoutes = require("./routes/progress");
const chatbotRoutes = require("./routes/Chatbot");
const roadmapRoutes = require("./routes/ai/generate-roadmap");
const customRoadmapRoutes = require("./routes/RoadmapRoutes");
const cors = require("cors");

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

app.use("/api/auth", authRoutes);
app.use("/api/bookmark", bookmarkRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/ai", roadmapRoutes);
app.use("/api/chatbot", chatbotRoutes);
app.use("/api/roadmaps", customRoadmapRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const authRoutes = require("./routes/auth");
const bookmarkRoutes = require("./routes/bookmark");
const progressRoutes = require("./routes/progress");
const chatbotRoutes = require("./routes/Chatbot");
const generateRoadmap = require("./routes/ai/generate-roadmap");
const customRoadmapRoutes = require("./routes/RoadmapRoutes");
const aiSuggestions = require("./routes/ai/ai-suggestions");
const cors = require("cors");
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
// Configure CORS options
const corsOptions = {
  origin: [FRONTEND_URL], // Allow both origins
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true, // Enable set cookie on cross-origin requests
};

app.use(cors(corsOptions));
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
app.use("/api/ai", generateRoadmap);
app.use("/api/chatbot", chatbotRoutes);
app.use("/api/roadmaps", customRoadmapRoutes);
app.use("/api/suggestions", aiSuggestions);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

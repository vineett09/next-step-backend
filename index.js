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
const contentAggregator = require("./routes/contentAggregator");
const CareerTracker = require("./routes/ai/CareerTracker");

const cors = require("cors");
dotenv.config();

// Then access FRONTEND_URL
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// Define allowed origins using FRONTEND_URL
const allowedOrigins = [FRONTEND_URL];

// Configure CORS options
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log("Blocked by CORS:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  optionsSuccessStatus: 204,
};

const app = express();
app.use(express.json());

// Apply corsOptions to all routes, not just OPTIONS requests
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
app.use("/api/content", contentAggregator);
app.use("/api/career-track", CareerTracker);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

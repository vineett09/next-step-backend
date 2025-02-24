require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());

const PORT = 5000;
const SERPAPI_KEY = process.env.SERPAPI_KEY;

app.get("/api/trending-skills", async (req, res) => {
  try {
    if (!SERPAPI_KEY) {
      throw new Error("SERPAPI_KEY is missing in .env file");
    }

    const searchQuery = "top trending tech skills this month site:linkedin.com";
    const apiUrl = `https://serpapi.com/search.json?q=${encodeURIComponent(
      searchQuery
    )}&api_key=${SERPAPI_KEY}`;

    console.log("Fetching from API:", apiUrl);

    const { data } = await axios.get(apiUrl);

    if (!data.organic_results || data.organic_results.length === 0) {
      throw new Error("No results found from API");
    }

    // Extract unique highlighted skills from all results
    const skillsSet = new Set();
    data.organic_results.forEach((result) => {
      if (result.snippet_highlighted_words) {
        result.snippet_highlighted_words.forEach((word) => skillsSet.add(word));
      }
    });

    // Convert Set to Array and return top 5 skills
    const skills = Array.from(skillsSet); // No limit, show all skills

    res.json({ skills });
  } catch (error) {
    console.error("Error fetching skills:", error.message);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

const express = require("express");
const fetch = require("node-fetch");
const auth = require("../middleware/auth");

const router = express.Router();

// Complete roadmap tag mappings based on TechFieldsData.js
const roadmapTagMap = {
  // Tech fields
  "full-stack-developer": [
    "fullstack",
    "webdev",
    "javascript",
    "react",
    "nodejs",
    "html",
    "css",
    "typescript",
    "api",
    "sql",
    "nosql",
  ],
  "data-scientist": [
    "datascience",
    "python",
    "machinelearning",
    "dataanalysis",
    "dataengineering",
    "statistics",
    "visualization",
  ],
  "artificial-intelligence": [
    "ai",
    "machinelearning",
    "deeplearning",
    "neuralnetworks",
    "computer-vision",
  ],
  cybersecurity: [
    "security",
    "cybersecurity",
    "infosec",
    "hacking",
    "encryption",
    "networksecurity",
    "penetrationtesting",
  ],
  "cloud-computing": [
    "cloud",
    "aws",
    "azure",
    "devops",
    "serverless",
    "docker",
  ],
  "android-developer": ["android", "kotlin", "java", "mobiledev", "google"],
  "blockchain-developer": [
    "blockchain",
    "web3",
    "ethereum",
    "crypto",
    "smartcontracts",
    "solidity",
  ],
  "game-development": ["gamedev", "unity", "unrealengine", "gamedevelopment"],
  mLops: [
    "mlops",
    "machinelearning",
    "devops",
    "datapipeline",
    "mlengineering",
    "cloud",
  ],
  robotics: ["robotics", "ros", "iot", "automation", "embedded"],
  "embedded-iot-developer": [
    "iot",
    "embedded",
    "arduino",
    "raspberrypi",
    "sensors",
  ],
  "iot-application-developer": [
    "iot",
    "internetofthings",
    "embedded",
    "mqtt",
    "sensors",
  ],
  "data-analyst": ["dataanalysis", "sql", "visualization", "tableau", "excel"],
  "ios-developer": ["ios", "swift", "swiftui", "mobiledev", "apple"],
  "frontend-developer": ["frontend", "react", "javascript", "css", "webdev"],
  "devops-engineer": ["devops", "docker", "kubernetes", "cicd", "automation"],
  "ui-ux-design": ["uidesign", "uxdesign", "webdesign", "figma", "design"],
  "backend-developer": ["backend", "api", "database", "nodejs", "serverside"],

  // Tech skills
  javascript: ["javascript", "webdev", "es6", "nodejs", "frontend"],
  python: ["python", "django", "flask", "datascience", "automation"],
  react: ["react", "javascript", "frontend", "webdev", "hooks"],
  nodejs: ["nodejs", "javascript", "express", "backend", "api"],
  sql: ["sql", "database", "mysql", "postgresql", "dataengineering"],
  docker: [
    "docker",
    "containerization",
    "devops",
    "kubernetes",
    "microservices",
  ],
  kubernetes: [
    "kubernetes",
    "k8s",
    "devops",
    "containerization",
    "cloudnative",
  ],
  tensorflow: [
    "tensorflow",
    "machinelearning",
    "deeplearning",
    "ai",
    "neuralnetworks",
  ],
  gitandgithub: [
    "git",
    "github",
    "versioncontrol",
    "opensource",
    "collaboration",
  ],
  aws: ["aws", "cloud", "serverless", "s3", "ec2"],
  "microsoft-azure": [
    "azure",
    "cloud",
    "microsoftcloud",
    "azurefunctions",
    "devops",
  ],
  linux: ["linux", "bash", "ubuntu", "sysadmin", "commandline"],
  java: ["java", "spring", "enterprise", "jvm", "backend"],
  cpp: ["cpp", "c++", "gamedev", "systems", "performance"],
  rust: ["rust", "systems", "webassembly", "performance", "safety"],
  golang: ["golang", "go", "backend", "microservices", "concurrency"],
  ruby: ["ruby", "rails", "rubyonrails", "backend", "webdev"],
  terraform: [
    "terraform",
    "iac",
    "devops",
    "cloudinfrastructure",
    "automation",
  ],
  kotlin: ["kotlin", "android", "jvm", "mobiledev", "java"],
  php: ["php", "laravel", "wordpress", "backend", "webdev"],
  redis: ["redis", "database", "caching", "nosql", "performance"],
  typescript: ["typescript", "javascript", "frontend", "angular", "typesafety"],
  angular: ["angular", "typescript", "frontend", "webdev", "spa"],
  vuejs: ["vuejs", "vue", "javascript", "frontend", "webdev"],
  flutter: ["flutter", "dart", "mobiledev", "crossplatform", "ui"],
  springboot: ["springboot", "java", "microservices", "backend", "api"],
  mongodb: ["mongodb", "nosql", "database", "backend", "json"],
  graphql: ["graphql", "api", "apollo", "rest", "webdev"],
  "react-native": [
    "reactnative",
    "react",
    "mobiledev",
    "crossplatform",
    "javascript",
  ],
  "apache-hadoop": [
    "hadoop",
    "bigdata",
    "datascience",
    "distributed",
    "mapreduce",
  ],
  jenkins: ["jenkins", "cicd", "devops", "automation", "pipeline"],
  pandas: ["pandas", "python", "dataanalysis", "datascience", "dataframe"],
  clang: ["c", "programming", "systems", "lowlevel", "embedded"],
  scala: ["scala", "jvm", "functional", "spark", "bigdata"],
  swift: ["swift", "ios", "mobiledev", "apple", "swiftui"],
  dsa: [
    "algorithms",
    "datastructures",
    "programming",
    "leetcode",
    "computerscience",
  ],

  // Default tags for non-logged in users or users with no bookmarks
  default: [
    "programming",
    "webdev",
    "technology",
    "javascript",
    "python",
    "beginners",
    "tutorial",
    "productivity",
    "career",
  ],
};

// Define content sources with their API endpoints and parsing logic
const contentSources = {
  devto: {
    name: "Dev.to",
    fetchArticles: async (tag, limit = 3, page = 1) => {
      const res = await fetch(
        `https://dev.to/api/articles?tag=${tag}&per_page=${limit}&page=${page}`
      );

      if (!res.ok) {
        throw new Error(`Error fetching Dev.to articles: ${res.status}`);
      }

      const data = await res.json();

      return data.map((article) => ({
        title: article.title,
        url: article.url,
        tag,
        published_at: article.published_at,
        source: "Dev.to",
        image: article.cover_image || article.social_image || null,
        articleId: `devto-${article.id}`,
        description: article.description || null,
        author: article.user?.name || null,
        readTime: article.reading_time_minutes
          ? `${article.reading_time_minutes} min read`
          : null,
      }));
    },
  },

  medium: {
    name: "Medium",
    fetchArticles: async (tag, limit = 3, page = 1) => {
      // Medium doesn't have a public API, using a proxy service or RSS feed parsing would be needed
      // For demonstration purposes, we'll use a mock RSS-to-JSON service endpoint
      const res = await fetch(
        `https://api.rss2json.com/v1/api.json?rss_url=https://medium.com/feed/tag/${tag}`
      );

      if (!res.ok) {
        throw new Error(`Error fetching Medium articles: ${res.status}`);
      }

      const data = await res.json();
      const startIndex = (page - 1) * limit;
      const items = data.items?.slice(startIndex, startIndex + limit) || [];

      return items.map((article, index) => {
        // Extract the first image from content if available
        const imgMatch = article.content?.match(/<img[^>]+src="([^">]+)"/);
        const image = imgMatch ? imgMatch[1] : null;

        // Calculate approximate read time (1 min per 200 words)
        const wordCount =
          article.content?.replace(/<[^>]+>/g, "").split(/\s+/).length || 0;
        const readTime = Math.max(1, Math.round(wordCount / 200));

        return {
          title: article.title,
          url: article.link,
          tag,
          published_at: article.pubDate,
          source: "Medium",
          image: image,
          articleId: `medium-${tag}-${page}-${index}`,
          description:
            article.description?.replace(/<[^>]+>/g, "").substring(0, 150) +
              "..." || null,
          author: article.author || null,
          readTime: `${readTime} min read`,
        };
      });
    },
  },
};

// Fetch content from multiple sources and mix them
const fetchMixedContent = async (tags, limit = 3, page = 1) => {
  const results = [];
  const sourcesPerTag = Math.min(2, Object.keys(contentSources).length); // Use 2 sources per tag
  const articlesPerSource = Math.ceil(limit / sourcesPerTag);

  try {
    for (const tag of tags) {
      // Select a rotating set of sources based on page number to ensure variety
      const sourceKeys = Object.keys(contentSources);
      const startSourceIndex = (page - 1) % sourceKeys.length;
      const selectedSources = [];

      for (let i = 0; i < sourcesPerTag; i++) {
        const sourceIndex = (startSourceIndex + i) % sourceKeys.length;
        selectedSources.push(sourceKeys[sourceIndex]);
      }

      // Fetch from selected sources for this tag
      for (const sourceKey of selectedSources) {
        try {
          const source = contentSources[sourceKey];
          const articles = await source.fetchArticles(
            tag,
            articlesPerSource,
            page
          );
          results.push(...articles);
        } catch (error) {
          console.error(
            `Error fetching from ${sourceKey} for tag ${tag}:`,
            error
          );
          // Continue with other sources if one fails
        }
      }
    }

    // Remove duplicate articles (same URL)
    const uniqueArticles = [];
    const seen = new Set();

    for (const article of results) {
      if (!seen.has(article.url)) {
        seen.add(article.url);
        uniqueArticles.push(article);
      }
    }

    // Sort by date (newest first)
    return uniqueArticles.sort(
      (a, b) => new Date(b.published_at) - new Date(a.published_at)
    );
  } catch (error) {
    console.error("Error fetching mixed content:", error);
    throw error;
  }
};

// GET /api/content/weekly/:roadmapId
router.get("/smart-feed/:roadmapId", async (req, res) => {
  const roadmapId = req.params.roadmapId.toLowerCase();
  const page = parseInt(req.query.page) || 1;
  const sourceFilter = req.query.source || "all"; // Optional source filter
  const tags = roadmapTagMap[roadmapId];

  if (!tags) {
    return res.status(400).json({ message: "Unknown roadmap category" });
  }

  try {
    let articles = await fetchMixedContent(tags, 6, page);

    // Apply source filter if specified
    if (sourceFilter !== "all") {
      articles = articles.filter(
        (article) => article.source.toLowerCase() === sourceFilter.toLowerCase()
      );
    }

    // Return pagination metadata along with articles
    res.json({
      articles,
      pagination: {
        currentPage: page,
        hasMore: articles.length > 0, // If we got articles, there might be more
      },
      availableSources: Object.keys(contentSources).map((key) => ({
        id: key,
        name: contentSources[key].name,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch content" });
  }
});

// GET /api/content/weekly/default - No auth required
router.get("/smart-feed/default", async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const sourceFilter = req.query.source || "all"; // Optional source filter

  try {
    const defaultTags = roadmapTagMap["default"];
    let articles = await fetchMixedContent(defaultTags, 8, page);

    // Apply source filter if specified
    if (sourceFilter !== "all") {
      articles = articles.filter(
        (article) => article.source.toLowerCase() === sourceFilter.toLowerCase()
      );
    }

    res.json({
      articles,
      pagination: {
        currentPage: page,
        hasMore: articles.length > 0,
      },
      availableSources: Object.keys(contentSources).map((key) => ({
        id: key,
        name: contentSources[key].name,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch default content" });
  }
});

// GET /api/content/sources - Returns available content sources
router.get("/sources", (req, res) => {
  const sources = Object.keys(contentSources).map((key) => ({
    id: key,
    name: contentSources[key].name,
  }));

  res.json({ sources });
});

module.exports = router;

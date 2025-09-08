import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import { Roadmap } from "../models/roadmapSchemas.js";

const fullStackDeveloperRoadmap = {
  name: "Web Development Roadmap 2025",
  slug: "web-development-roadmap-2025", // Add this line
  children: [
    {
      name: "Web Development Basics",
      children: [
        {
          name: "HTML",
          children: [
            {
              name: "Semantic HTML",
            },
            {
              name: "Forms & Validation",
            },
          ],
        },
        {
          name: "CSS",
          children: [
            {
              name: "CSS Basics",
            },
            {
              name: "CSS Grid & Flexbox",
            },
            {
              name: "Responsive Design",
            },
          ],
        },
        {
          name: "JavaScript",
          children: [
            {
              name: "Events",
            },
            {
              name: "Asynchronous Programming",
            },
            {
              name: "DOM Manipulation",
            },
            {
              name: "Error Handling",
            },
            {
              name: "ES6+ Features",
            },
          ],
        },
      ],
    },
    {
      name: "Advanced Front-End Development",
      dividerText:
        "Front-end conquered—time to power up with server-side skills.",
      children: [
        {
          name: "CSS Frameworks",
          children: [
            {
              name: "Tailwind CSS",
              preferred: true,
            },
            {
              name: "Bootstrap",
            },
          ],
        },
        {
          name: "JavaScript Frameworks",
          children: [
            {
              name: "React",
              preferred: true,
            },
            {
              name: "Vue.js",
            },
            {
              name: "Angular",
            },
          ],
        },
      ],
    },
    {
      name: "Back-End Foundations",
      dividerText: "Build the back-end, now connect and secure it with APIs.",
      children: [
        {
          name: "Server-Side Languages",
          children: [
            {
              name: "Node.js",
              preferred: true,
            },
            {
              name: "Python",
            },
            {
              name: "Ruby",
            },
          ],
        },
        {
          name: "Databases",
          children: [
            {
              name: "Relational Databases",
            },
            {
              name: "NoSQL Databases",
            },
          ],
        },
      ],
    },
    {
      name: "APIs and Authentication",
      dividerText: "Systems linked—deploy them live with DevOps fundamentals.",
      children: [
        {
          name: "API Development",
          children: [
            {
              name: "RESTful APIs",
              preferred: true,
            },
            {
              name: "GraphQL",
            },
          ],
        },
        {
          name: "Authentication & Authorization",
          children: [
            {
              name: "JWT",
              preferred: true,
            },
            {
              name: "OAuth",
            },
            {
              name: "Session Management",
            },
          ],
        },
      ],
    },
    {
      name: "Deployment and DevOps Basics",
      dividerText: "Apps launched, now optimize speed and lock down security.",
      children: [
        {
          name: "Version Control Systems",
          children: [
            {
              name: "Git",
            },
            {
              name: "GitHub",
            },
          ],
        },
        {
          name: "Cloud Hosting",
          children: [
            {
              name: "AWS",
              preferred: true,
            },
            {
              name: "Heroku",
            },
          ],
        },
        {
          name: "Containerization",
          children: [
            {
              name: "Docker",
            },
          ],
        },
      ],
    },
    {
      name: "Performance and Security",
      dividerText: "Fast and safe—scale up with advanced DevOps tools.",
      children: [
        {
          name: "Web Performance Optimization",
          children: [
            {
              name: "Lazy Loading",
            },
            {
              name: "Image Optimization",
            },
            {
              name: "Caching",
            },
            {
              name: "Code Splitting",
            },
          ],
        },
        {
          name: "Security Best Practices",
          children: [
            {
              name: "HTTPS",
            },
            {
              name: "Input Validation",
            },
            {
              name: "Rate Limiting",
            },
            {
              name: "Content Security Policy",
            },
          ],
        },
      ],
    },
    {
      name: "Advanced DevOps and Scalability",
      children: [
        {
          name: "CI/CD",
          children: [
            {
              name: "Jenkins",
              preferred: true,
            },
            {
              name: "GitHub Actions",
            },
            {
              name: "CircleCI",
            },
          ],
        },
        {
          name: "Container Orchestration",
          children: [
            {
              name: "Kubernetes",
              preferred: true,
            },
            {
              name: "Docker Compose",
            },
            {
              name: "EKS",
            },
            {
              name: "GKE",
            },
            {
              name: "AKS",
            },
          ],
        },
        {
          name: "Monitoring",
          children: [
            {
              name: "Prometheus",
            },
            {
              name: "Grafana",
            },
          ],
        },
      ],
    },
    {
      name: "Emerging Technologies",
      children: [
        {
          name: "Progressive Web Apps (PWAs)",
          children: [
            {
              name: "Service Workers",
            },
          ],
        },
        {
          name: "Serverless Architecture",
          children: [
            {
              name: "AWS Lambda",
              preferred: true,
            },
            {
              name: "Vercel",
            },
          ],
        },
        {
          name: "WebAssembly",
          children: [
            {
              name: "Rust for WebAssembly",
            },
          ],
        },
      ],
    },
    {
      name: "Professional Development",
      children: [
        {
          name: "Portfolio",
          children: [
            {
              name: "Project Development",
            },
            {
              name: "Code Readability",
            },
          ],
        },
        {
          name: "Interview Preparation",
          children: [
            {
              name: "Algorithms",
            },
            {
              name: "System Design",
            },
          ],
        },
      ],
    },
    {
      name: "Continuous Learning",
    },
  ],
};

async function insertRoadmap() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);

    console.log("Connected to MongoDB");

    const newRoadmap = new Roadmap(fullStackDeveloperRoadmap);
    const savedRoadmap = await newRoadmap.save();
    console.log("Roadmap created successfully:", savedRoadmap._id);

    console.log("Operation completed successfully");
  } catch (error) {
    console.error("Error inserting roadmap:", error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log("Database connection closed");
  }
}

// Run the insertion
insertRoadmap();

const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { check, validationResult } = require("express-validator");
const User = require("../models/User");
const dotenv = require("dotenv");
const auth = require("../middleware/auth");
const firebaseAdmin = require("../services/firebaseAdmin");

dotenv.config();

const router = express.Router();

router.post(
  "/register",
  [
    check("username", "Username is required").not().isEmpty(),
    check("email", "Valid email is required").isEmail(),
    check("password", "Password should be at least 6 characters").isLength({
      min: 6,
    }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password } = req.body;

    try {
      let existingUser = await User.findOne({ email });
      if (existingUser) {
        return res
          .status(400)
          .json({ msg: "User with this email already exists" });
      }

      let existingUsername = await User.findOne({ username });
      if (existingUsername) {
        return res.status(400).json({ msg: "Username is already taken" });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const user = new User({ username, email, password: hashedPassword });
      await user.save();

      const payload = { user: { id: user.id } };
      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });

      res.json({
        token,
        user: { id: user.id, username: user.username, email: user.email },
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ msg: "Server error" });
    }
  }
);

router.post(
  "/login",
  [
    check("email", "Valid email is required").isEmail(),
    check("password", "Password is required").exists(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ msg: "Invalid email or password" });
    }

    const { email, password } = req.body;

    try {
      let user = await User.findOne({ email });
      if (!user)
        return res.status(400).json({ msg: "Invalid email or password" });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch)
        return res.status(400).json({ msg: "Invalid email or password" });

      const payload = { user: { id: user.id } };
      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });

      res.json({
        token,
        user: { id: user.id, username: user.username, email: user.email },
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ msg: "Server error" });
    }
  }
);
router.post(
  "/google-login",
  [
    check("email", "Valid email is required").isEmail(),
    check("googleId", "Google ID Token is required").not().isEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, googleId } = req.body;

    try {
      // Verify Google ID Token
      let decodedToken;
      try {
        decodedToken = await firebaseAdmin.auth().verifyIdToken(googleId);

        // Additional verification
        if (decodedToken.email !== email) {
          return res.status(401).json({ msg: "Email verification failed" });
        }
      } catch (error) {
        console.error("Firebase Token Verification Error:", error);
        return res.status(401).json({ msg: "Invalid Google authentication" });
      }

      // Check if user exists
      let user = await User.findOne({ email });

      if (!user) {
        // Create new user if not exists
        const salt = await bcrypt.genSalt(10);
        const randomPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(randomPassword, salt);

        user = new User({
          username: username || email.split("@")[0],
          email,
          password: hashedPassword,
          googleId: decodedToken.uid,
        });

        await user.save();
      } else {
        // Handle existing user
        if (user.googleId && user.googleId !== decodedToken.uid) {
          return res.status(400).json({
            msg: "Email already registered with a different authentication method",
          });
        }

        // Update googleId if not set
        if (!user.googleId) {
          user.googleId = decodedToken.uid;
          await user.save();
        }
      }

      // Generate token
      const payload = { user: { id: user.id } };
      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ msg: "Server error" });
    }
  }
);
module.exports = router;

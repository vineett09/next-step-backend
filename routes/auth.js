const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { check, validationResult } = require("express-validator");
const User = require("../models/User");
const dotenv = require("dotenv");
const firebaseAdmin = require("../services/firebaseAdmin");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
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

      const payload = {
        userId: user._id, // Change from user.id to user._id
        email: user.email, // Optional: add more claims if needed
      };

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

      const payload = {
        userId: user._id, // Change from user.id to user._id
        email: user.email, // Optional: add more claims if needed
      };

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
router.post("/check-user", async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    res.json({ exists: !!user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});
router.post(
  "/google-login",
  [
    check("email", "Valid email is required").isEmail(),
    check("googleId", "Google ID Token is required").not().isEmpty(),
  ],
  async (req, res) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
        code: "VALIDATION_ERROR",
      });
    }

    const { username, email, googleId } = req.body;

    try {
      // Verify Google ID Token
      let decodedToken;
      try {
        decodedToken = await firebaseAdmin.auth().verifyIdToken(googleId);

        // Verify email matches
        if (decodedToken.email !== email) {
          return res.status(401).json({
            success: false,
            msg: "Email verification failed",
            code: "EMAIL_MISMATCH",
            details: "Token email doesn't match provided email",
          });
        }

        // Verify email is verified by Google
        if (!decodedToken.email_verified) {
          return res.status(401).json({
            success: false,
            msg: "Email not verified by Google",
            code: "EMAIL_NOT_VERIFIED",
          });
        }
      } catch (error) {
        console.error("Google Token Verification Failed:", {
          error: error.message,
          code: error.code,
        });

        return res.status(401).json({
          success: false,
          msg: "Invalid Google authentication",
          code: "INVALID_GOOGLE_TOKEN",
          details: error.message,
        });
      }

      // Check if user exists by email
      let user = await User.findOne({ email });

      if (!user) {
        // ===== NEW USER REGISTRATION =====
        if (!username) {
          return res.status(400).json({
            success: false,
            msg: "Username is required for registration",
            code: "USERNAME_REQUIRED",
          });
        }

        // Clean and validate username
        const cleanUsername = username.trim();
        if (cleanUsername.length < 3) {
          return res.status(400).json({
            success: false,
            msg: "Username must be at least 3 characters",
            code: "USERNAME_TOO_SHORT",
          });
        }

        // Check username availability (case insensitive)
        const usernameExists = await User.findOne({
          username: { $regex: new RegExp(`^${cleanUsername}$`, "i") },
        });

        if (usernameExists) {
          return res.status(409).json({
            success: false,
            msg: "Username is already taken",
            code: "USERNAME_TAKEN",
            suggestedUsername: `${cleanUsername}${Math.floor(
              Math.random() * 1000
            )}`,
          });
        }

        // Create new user
        try {
          const salt = await bcrypt.genSalt(10);
          const tempPassword = Math.random().toString(36).slice(-8);
          const hashedPassword = await bcrypt.hash(tempPassword, salt);

          user = new User({
            username: cleanUsername,
            email,
            password: hashedPassword,
            googleId: decodedToken.uid,
            emailVerified: true,
          });

          await user.save();
        } catch (dbError) {
          // Handle duplicate key errors (race conditions)
          if (dbError.code === 11000) {
            return res.status(409).json({
              success: false,
              msg: "Username is already taken",
              code: "USERNAME_TAKEN",
              details: "Please try a different username",
            });
          }

          throw dbError;
        }
      } else {
        // ===== EXISTING USER LOGIN =====
        // Check if account is already linked to different Google account
        if (user.googleId && user.googleId !== decodedToken.uid) {
          return res.status(409).json({
            success: false,
            msg: "Email already registered with different Google account",
            code: "ACCOUNT_CONFLICT",
          });
        }

        // Update Google ID if missing
        if (!user.googleId) {
          user.googleId = decodedToken.uid;
          await user.save();
        }
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user._id,
          email: user.email,
        },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      // Successful response
      return res.json({
        success: true,
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          isNewUser: !user.lastLogin,
        },
      });

      // Update last login timestamp
      user.lastLogin = new Date();
      await user.save();
    } catch (error) {
      console.error("Google Login Process Failed:", {
        error: error.message,
        stack: error.stack,
      });

      return res.status(500).json({
        success: false,
        msg: "Authentication process failed",
        code: "AUTH_PROCESS_FAILED",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// Request password reset
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        msg: "User with this email does not exist",
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString("hex");
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour from now

    // Save token to user
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpiry;
    await user.save();

    // Create reset URL
    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    // Configure email transporter
    // Configure email transporter
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE, // e.g. 'gmail'
      host: process.env.EMAIL_HOST || "smtp.gmail.com", // Add this line
      port: process.env.EMAIL_PORT || 587, // Add this line
      secure: process.env.EMAIL_SECURE === "true", // Add this line
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    // Email options
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: user.email,
      subject: "Password Reset Request",
      html: `
        <h1>You requested a password reset</h1>
        <p>Please click the following link to reset your password:</p>
        <a href="${resetUrl}" clicktracking="off">${resetUrl}</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you did not request this reset, please ignore this email.</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({
      success: true,
      msg: "Reset link sent to email",
    });
  } catch (err) {
    console.error("Password reset request error:", err);
    res.status(500).json({
      success: false,
      msg: "Error sending reset email",
    });
  }
});

// Reset password with token
router.post("/reset-password/:resetToken", async (req, res) => {
  const { password } = req.body;
  const { resetToken } = req.params;

  try {
    // Find user with valid token
    const user = await User.findOne({
      resetPasswordToken: resetToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        msg: "Invalid or expired reset token",
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // Clear reset token fields
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    res.status(200).json({
      success: true,
      msg: "Password has been reset successfully",
    });
  } catch (err) {
    console.error("Password reset error:", err);
    res.status(500).json({
      success: false,
      msg: "Error resetting password",
    });
  }
});
module.exports = router;

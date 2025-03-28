const jwt = require("jsonwebtoken"); // Add this import at the top
const User = require("../models/User");

const auth = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "No token provided",
        code: "NO_TOKEN",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user
    const user = await User.findOne({
      _id: decoded.userId,
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    // Attach user and token to request
    req.token = token;
    req.user = user;
    next();
  } catch (err) {
    console.error("Auth middleware error:", err);

    let errorMessage = "Not authorized";
    let errorCode = "AUTH_ERROR";

    if (err.name === "TokenExpiredError") {
      errorMessage = "Token expired";
      errorCode = "TOKEN_EXPIRED";
    } else if (err.name === "JsonWebTokenError") {
      errorMessage = "Invalid token";
      errorCode = "INVALID_TOKEN";
    }

    res.status(401).json({
      success: false,
      error: errorMessage,
      code: errorCode,
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

module.exports = auth;

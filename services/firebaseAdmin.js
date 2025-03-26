const admin = require("firebase-admin");
const dotenv = require("dotenv");

dotenv.config();

const initFirebaseAdmin = () => {
  try {
    // Ensure FIREBASE_SERVICE_ACCOUNT is a valid JSON string
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
      throw new Error("Firebase service account not configured");
    }

    // Parse the service account JSON
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

    // Initialize Firebase Admin with proper credentials
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    return admin;
  } catch (error) {
    console.error("Firebase Admin Initialization Error:", error);
    throw error;
  }
};

module.exports = initFirebaseAdmin();

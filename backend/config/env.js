const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../.env") });
if (!process.env.MONGO_URI) {
  dotenv.config({ path: path.resolve(__dirname, "../../.env") });
}

const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: process.env.PORT || 5000,
  MONGO_URI: process.env.MONGO_URI || "",
  JWT_SECRET: process.env.JWT_SECRET || "",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:5173",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
  OPENAI_MODEL: process.env.OPENAI_MODEL || "gpt-4.1-mini",
};

if (!env.MONGO_URI) {
  console.warn("Warning: MONGO_URI is not set in .env");
}

if (!env.JWT_SECRET) {
  console.warn("Warning: JWT_SECRET is not set in .env");
}

module.exports = { env };

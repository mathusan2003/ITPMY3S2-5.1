const mongoose = require("mongoose");
const { env } = require("./env");

const connectDB = async () => {
  try {
    const connection = await mongoose.connect(env.MONGO_URI);
    console.log(`MongoDB connected: ${connection.connection.host}`);
  } catch (error) {
    console.error(`Database connection failed: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;

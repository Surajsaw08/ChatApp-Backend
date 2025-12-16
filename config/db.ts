import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const connectDB = async (): Promise<void> => {
  try {
    mongoose.connect(process.env.MONGO_URI as string);
  } catch (error) {
    console.error("DB connection error");
  }
};

export default connectDB;

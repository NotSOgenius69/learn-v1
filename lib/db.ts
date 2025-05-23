import mongoose from "mongoose";

// Define the type for the global mongoose cache
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Add mongoose to the globalThis
declare global {
  var mongoose: MongooseCache | undefined;
}

// Fix connection string issues by trimming quotes
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!MONGODB_URI) {
  throw new Error(
    "Please define the MONGODB_URI or MONGO_URI environment variable inside .env.local"
  );
}

// Clean the connection string if it has quotes
const cleanURI = MONGODB_URI.replace(/^['"](.*)['"]$/, '$1');
console.log("Using MongoDB connection string (sanitized):", cleanURI.replace(/\/\/([^:]+):[^@]+@/, "//***:***@"));

let cached = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

async function connectDB() {
  if (cached.conn) {
    console.log("Using existing MongoDB connection");
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 30000,
    };

    console.log("Establishing new MongoDB connection...");
    cached.promise = mongoose.connect(cleanURI, opts).then((mongoose) => {
      console.log("MongoDB connected successfully");
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (e) {
    cached.promise = null;
    console.error("MongoDB connection error:", e);
    throw e;
  }
}

export default connectDB;
export { mongoose };
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  var mongoose: MongooseCache | undefined;
}

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is not set');
}

// Connection cache for serverless environments
const cached: MongooseCache =
  globalThis.mongoose ?? (globalThis.mongoose = { conn: null, promise: null });

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
      console.log('[MongoDB] Connected to MongoDB Atlas');
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

// Event handlers
mongoose.connection.on('connected', () => {
  console.log('[MongoDB] Connection established');
});

mongoose.connection.on('error', (err) => {
  console.error('[MongoDB] Connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.log('[MongoDB] Connection disconnected');
});

export default connectDB;
export { mongoose };

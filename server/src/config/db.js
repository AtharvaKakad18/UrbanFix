import mongoose from 'mongoose';

export const connectDB = async (uri = process.env.MONGODB_URI) => {
  if (!uri) {
    throw new Error('[Database] FATAL: MONGODB_URI environment variable is missing.');
  }

  let retries = 5;
  while (retries > 0) {
    try {
      console.log('[Database] Connecting strictly to MongoDB Atlas cluster...');
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 8000,
      });
      console.log(`[Database] MongoDB Atlas connected successfully: ${conn.connection.host}`);
      return conn;
    } catch (err) {
      retries -= 1;
      console.error(`[Database] Atlas connection attempt failed (${retries} retries left):`, err.message);
      if (retries === 0) {
        throw new Error(`[Database] Could not connect to Atlas cluster: ${err.message}`);
      }
      // Wait 3 seconds before next retry
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
};

import { MongoClient } from 'mongodb';

const uri: string = process.env.MONGODB_URI || '';
const options = {};

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient>;

if (!uri) {
  // Graceful fallback when MONGODB_URI is not provided (e.g. during build / CI)
  clientPromise = Promise.reject(new Error('MONGODB_URI is not defined'));
} else if (process.env.NODE_ENV === 'development') {
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
    _mongoClient?: MongoClient;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClient = client;
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;

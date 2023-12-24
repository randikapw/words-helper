import mongoose from "mongoose";
// config
// import { MONGO_CONNECTION_STRING } from 'src/config-global';

export default async function connectMongo() {
    if (mongoose.connection.readyState === 1 ) {
        return mongoose.connection.asPromise();
    }
    
    return await mongoose.connect(process.env.MONGO_CONNECTION_STRING)
}
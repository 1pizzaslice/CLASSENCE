import mongoose from 'mongoose';

const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGO_URI as string; 
        await mongoose.connect(mongoURI); 
        console.log('DB connected');
    } catch (error) {
        console.error('DB connection failed:', error);
        process.exit(1); // exit the process with failure
    }
};

export default connectDB;

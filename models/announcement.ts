import mongoose, { Schema, Document } from 'mongoose';

interface Announcement extends Document {
  title: string;
  description?: string;
  media: string[];  // urls of uploaded files
  poll?: {
    question: string;
    options: PollOption[];
  };
  createdBy: Schema.Types.ObjectId; 
  createdAt: Date;
}

interface PollOption {
  optionText: string;
  votes: number;
}

const AnnouncementSchema = new Schema<Announcement>({
  title: { type: String, required: true },
  description: { type: String },
  media: [{ type: String }],  
  poll: {
    question: String,
    options: [{ optionText: String, votes: { type: Number, default: 0 } }]
  },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

const Announcement = mongoose.model<Announcement>('Announcement', AnnouncementSchema);
export default Announcement;


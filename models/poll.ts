
import mongoose, { Schema, Document } from 'mongoose';

interface PollResponse extends Document {
    announcementId: Schema.Types.ObjectId;
    userId: Schema.Types.ObjectId;
    selectedOption: string; 
  }
  
  const PollResponseSchema = new Schema<PollResponse>({
    announcementId: { type: Schema.Types.ObjectId, ref: 'Announcement', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    selectedOption: { type: String, required: true }
  });
  
  const PollResponse = mongoose.model<PollResponse>('PollResponse', PollResponseSchema);
  export default PollResponse;
import mongoose, { Document , Schema } from 'mongoose';
export interface IAssignment extends Document {
    name: string;
    description: string;
    media?: string[];
    dueDate: Date;
    submissions:string[];
    createdAt: Date;
    updatedAt: Date;
    classroom: Schema.Types.ObjectId;
}

const assignmentSchema = new Schema<IAssignment>({
    name: { 
        type: String, 
        required: true 
    },
    description: { 
        type: String, 
        required: true 
    },
    media: [{ 
        type: String 
    }],
    dueDate: { 
        type: Date, 
        required: true 
    },
    submissions:[
        {
            type:Schema.Types.ObjectId,
            ref:'Submission'
        }
    ] ,
    classroom:{
        type: Schema.Types.ObjectId,
        ref: 'Classroom',
        required: true
    }
}, { timestamps: true });

const Assignment = mongoose.model<IAssignment>('Assignment', assignmentSchema);
export default Assignment;

import { Schema, model, Document } from "mongoose"

export interface IUser extends Document {
    _id: string;       // was getting error therefore set the default type to string
    name: string;
    email: string;
    password: string;
    resetPasswordToken?: string;
    resetPasswordExpires?: Date;
    lastPasswordResetRequest?: Date;
    isVerified:boolean;
    classRooms: string[];
    createdAt: Date;
    updatedAt: Date;
    version:number;
    recentClasses:string[];
    recentGrades:string[];
    isNotificationEnabled:boolean;
    recentNotifications:string[];
    createdClassrooms:string[];
    joinedClassrooms:string[];
    isAdmin:boolean;
}

const UserSchema: Schema = new Schema({
    name: {
        type: String,
        required: true,
        min: 3,
        max: 255
    },
    email: {
        type: String,
        required: true,
        max: 255
    },
    password: {
        type: String,
        required: true,
        max: 1024, //enough space to store hashes 
        min: 6
    },
    resetPasswordToken: {
        type: String,
    },
    resetPasswordExpires: {
        type: Date,
    },
    lastPasswordResetRequest: {
        type: Date,
    },
    isVerified:{
        type:Boolean,
        required:true,
        default:false
    },
    classRooms:[{
        type:Schema.Types.ObjectId,
        ref:'Classroom'
    }],
    createdClassrooms:[{
        type:Schema.Types.ObjectId,
        ref:'Classroom'
    }],
    joinedClassrooms:[{
        type:Schema.Types.ObjectId,
        ref:'Classroom'
    }],
    version:{
        type:Number,
        default:0
    },
    recentClasses:[{
        type:Schema.Types.ObjectId,
        ref:'Classroom'
    }],
    recentGrades:[{
        type:String, 
    }],
    isNotificationEnabled:{
        type:Boolean,
        default:true
    },
    recentNotifications:[{
        type:Schema.Types.ObjectId,
        ref:'Notification'
    }],
    isAdmin:{
        type:Boolean,
        default:false
    }

},{timestamps:true})

const User = model<IUser>('User', UserSchema)
export default User;
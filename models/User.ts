import { Schema, model, Document } from "mongoose"

interface IUser extends Document {
    _id: string;       // was getting error therefore set the default type to string
    name: string;
    email: string;
    password: string;
    resetPasswordToken?: string;
    resetPasswordExpires?: Date;
    otp?:string;
    otpExpires?:Date;
    isVerified:boolean;
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
    otp:{
        type:String
    },
    otpExpires:{
        type:Date
    },
    isVerified:{
        type:Boolean,
        required:true,
        default:false
    }
})

const User = model<IUser>('User', UserSchema)
export default User;
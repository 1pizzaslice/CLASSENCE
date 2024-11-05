import {Schema,model,Document} from "mongoose";

interface IOtp extends Document{
    _id:string;
    email:string;
    otp:string;
    expiresAt:Date;
    createdAt:Date;
    updatedAt:Date;
}

const OtpSchema:Schema = new Schema({
    email:{
        type:String,
        required:true
    },
    otp:{
        type:String,
        required:true
    },
    expiresAt:{
        type:Date,
        required:true,
        index:{expires:0}
    }
},{timestamps:true});




const Otp = model<IOtp>('Otp',OtpSchema);

export default Otp;
import {Schema,model,Document} from "mongoose";

interface IOtp extends Document{
    _id:string;
    email:string;
    otp:string;
    expiresAt:Date;
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
});




const Otp = model<IOtp>('Otp',OtpSchema);

export default Otp;
import { model, Schema } from "mongoose";
import { UserProps } from "../types";

const UserSchema = new Schema<UserProps>({
  email: {
    type: String,
    lowercase: true,
    trim: true,
    unique: true,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  avatar: {
    type: String,
    default: "",
  },
  created: {
    type: Date,
    default: Date.now(),
  },
});

export default model<UserProps>("user", UserSchema);

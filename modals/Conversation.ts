import mongoose, { model, Schema } from "mongoose";
import { ConversationProps } from "../types";

const ConversationSchema = new Schema<ConversationProps>({
  type: {
    type: String,
    enum: ["direct", "group"],
    required: true,
  },
  name: String,
  participants: [
    {
      type: Schema.Types.ObjectId,
      ref: "User",
      require: true,
    },
  ],
  lastMessage: {
    type: String,
    ref: "Message",
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  avatar: {
    type: String,
    default: "",
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  updatedAt: {
    type: Date,
    default: Date.now(),
  },
});

ConversationSchema.pre("save", async function () {
  this.updatedAt = new Date();
});

export default model<ConversationProps>("Conversation", ConversationSchema);

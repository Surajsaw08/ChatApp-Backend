import { Socket, Server as SocketIoserver } from "socket.io";
import Conversation from "../modals/Conversation";
import User from "../modals/User";
export function registerChatEvents(io: SocketIoserver, socket: Socket) {
  socket.on("newConversation", async (data) => {
    //console.log("newConversation Event:", data);

    try {
      if (data.type == "direct") {
        const existingConversation = await Conversation.findOne({
          type: "direct",
          participants: { $all: data.participants, $size: 2 },
        })
          .populate({
            path: "participants",
            select: "name avatar email",
          })
          .lean();

        if (existingConversation) {
          socket.emit("newConversation", {
            success: true,
            data: { ...existingConversation, isNew: false },
          });
          return;
        }
      }

      // create new conversation

      const conversation = await Conversation.create({
        type: data.type,
        participants: data.participants,
        name: data.name || "", // can be empty if group conversation
        avatar: data.avatar || "", //same
        createdBy: socket.data.userId,
      });

      // get all connected sockets
      const connectedSockets = Array.from(io.sockets.sockets.values()).filter(
        (s) => data.participants.includes(s.data.userId)
      );

      connectedSockets.forEach((participantSocket) => {
        participantSocket.join(conversation._id.toString());
      });

      //send conversation back(populated)

      const populatedConversation = await Conversation.findById(
        conversation._id
      )
        .populate({
          path: "participants",
          select: "name avatar email",
        })
        .lean();

      if (!populatedConversation) {
        throw new Error("failed to populate conversation");
      }

      // emit conversation to all participants

      io.to(conversation._id.toString()).emit("newConversation", {
        success: true,
        data: { ...populatedConversation, isNew: true },
      });
    } catch (error: any) {
      console.log("newConversation error :", error);
      socket.emit("newConversation", {
        success: false,
        msg: "Failed to create conversation",
      });
    }
  });
}

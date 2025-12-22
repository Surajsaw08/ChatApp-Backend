import { Socket, Server as SocketIoserver } from "socket.io";
import Conversation from "../modals/Conversation";
import User from "../modals/User";
import Message from "../modals/Message";
import { create } from "domain";
export function registerChatEvents(io: SocketIoserver, socket: Socket) {
  socket.on("getConversation", async () => {
    // console.log("getConversation Event");
    try {
      const userId = socket.data.userId;
      if (!userId) {
        socket.emit("getConversation", {
          success: false,
          msg: "unAuthrised",
        });
        return;
      }

      // fetch all conversation where user is participent

      const conversation = await Conversation.find({
        participants: userId,
      })
        .sort({ updatedAt: -1 })
        .populate({
          path: "lastMessage",
          select: "content senderId attachment createdAt",
        })
        .populate({
          path: "participants",
          select: "name avatar email",
        })
        .lean();

      socket.emit("getConversation", {
        success: true,
        data: conversation,
      });
    } catch (error) {
      console.log("getConversation error :", error);
      socket.emit("getConversation", {
        success: false,
        msg: "Failed to get conversation",
      });
    }
  });

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

  socket.on("newMessage", async (data) => {
    // console.log("new Message :", data);

    try {
      const message = await Message.create({
        conversationId: data.conversationId,
        senderId: data.sender.id,
        content: data.content,
        attachment: data.attachment,
      });

      io.to(data.conversationId.toString()).emit("newMessage", {
        success: true,
        data: {
          id: message._id,
          content: data.content,
          sender: {
            id: data.sender.id,
            name: data.sender.name,
            avatar: data.sender.avatar,
          },
          attachment: data.attachment,
          ceatedAt: new Date().toISOString(),
          conversationId: data.conversationId,
        },
      });

      // update conversation last message

      await Conversation.findByIdAndUpdate(data.conversationId, {
        lastMessage: message._id,
      });
    } catch (error) {
      console.log("newMessage error :", error);
      socket.emit("newMessage", {
        success: false,
        msg: "Failed to get newMessage",
      });
    }
  });

  socket.on("getMessages", async (data: { conversationId: string }) => {
    // console.log("new Message :", data);

    try {
      const messages = await Message.find({
        conversationId: data.conversationId,
      })
        .sort({ createdAt: -1 })
        .populate<{ senderId: { _id: string; name: string; avatar: string } }>({
          path: "senderId",
          select: "name avatar",
        })
        .lean();

      const messageWithSender = messages.map((message) => ({
        ...message,
        id: message._id,
        sender: {
          id: message.senderId._id,
          name: message.senderId.name,
          avatar: message.senderId.avatar,
        },
      }));

      socket.emit("getMessages", {
        success: true,
        data: messageWithSender,
      });
    } catch (error) {
      console.log("getMessages error :", error);
      socket.emit("getMessages", {
        success: false,
        msg: "Failed to fetch Messages",
      });
    }
  });
}

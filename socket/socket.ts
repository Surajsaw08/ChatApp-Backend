import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { Server as SocketIoServer, Socket } from "socket.io";
import { registerUserEvents } from "./userEvents";
import { registerChatEvents } from "./chatEvents";
import Conversation from "../modals/Conversation";

dotenv.config();

export function initializeSocket(server: any): SocketIoServer {
  const io = new SocketIoServer(server, {
    cors: {
      origin: "*", // allow all origin
    },
  }); // socket io server instance

  //auth middleware

  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error("Authentication error : no token provided"));
    }

    jwt.verify(
      token,
      process.env.JWT_SECRET as string,
      (err: any, decode: any) => {
        if (err) {
          return next(new Error("Authentication error : Invalid token "));
        }

        //attach user data to Socket

        let userData = decode.user;
        socket.data = userData;
        socket.data.userId = userData.id;
        next();
      }
    );
  });

  // when sockets connects , register events

  io.on("connection", async (socket: Socket) => {
    const userId = socket.data.userId;
    console.log(`User connected ${userId} , username :${socket.data.name}`);

    //register event
    registerChatEvents(io, socket);
    registerUserEvents(io, socket);

    // join all the conversations the user part of

    try {
      const conversations = await Conversation.find({
        participants: userId,
      }).select("_id");

      conversations.forEach((conversation) => {
        socket.join(conversation._id.toString());
      });
    } catch (error: any) {
      console.log("Error joining conversation :", error);
    }

    socket.on("disconnect", () => {
      console.log(`user disconnected ${userId} ,username ${socket.data.name}`);
    });
  });
  return io;
}

import { Socket, Server as SocketIoserver } from "socket.io";
import User from "../modals/User";
import { generateToken } from "../utils/token";

export function registerUserEvents(io: SocketIoserver, socket: Socket) {
  socket.on("testSocket", (data) => {
    socket.emit("testSocket", { msg: "its working" });
  });

  socket.on(
    "updateProfile",
    async (data: { name?: String; avatar?: String }) => {
      console.log("update profile data", data);

      const userId = socket.data.userId;

      if (!userId) {
        return socket.emit("updateProfile", {
          success: false,
          msg: "Unautherized",
        });
      }

      try {
        const updatedUser = await User.findByIdAndUpdate(
          userId,
          {
            name: data.name,
            avatar: data.avatar,
          },
          { new: true } //will return the user with updated value
        );

        if (!updatedUser) {
          return socket.emit("updateProfile", {
            success: false,
            msg: "User not found",
          });
        }

        // generate new token

        const newToken = generateToken(updatedUser);

        socket.emit("updateProfile", {
          success: true,
          data: { token: newToken },
          msg: "Profile updated successfully",
        });
      } catch (error) {
        console.log("error updating profile", error);

        socket.emit("updateProfile", {
          success: false,
          msg: "error ",
        });
      }
    }
  );
}

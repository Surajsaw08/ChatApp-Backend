import { Request, Response } from "express";
import User from "../modals/User";
import bcrypt from "bcryptjs";
import { generateToken } from "../utils/token";

export const registerUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { email, password, name, avatar } = req.body;

  try {
    let user = await User.findOne({ email });

    if (user) {
      res.status(400).json({ success: false, msg: "user already exist" });
      return;
    }

    //create new user
    user = new User({
      email,
      password,
      name,
      avatar: avatar || "",
    });

    //passward bcrypt

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    //save user & generate token

    await user.save();

    const token = generateToken(user);

    res.status(200).json({ success: true, token });
  } catch (error) {
    console.log("error", error);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};

export const loginUser = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });

    if (!user) {
      res.status(400).json({ success: false, msg: "user not found" });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      res.status(402).json({ success: false, msg: "password does not match" });
      return;
    }

    const token = generateToken(user);

    res.status(200).json({ success: true, token });
  } catch (error) {
    console.log("error", error);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};

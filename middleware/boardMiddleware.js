import mongoose from "mongoose";
import Board from "../models/Board.js";

export const validateObjectId = (req, res, next) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid board ID" });
  }
  next();
};

export const loadBoard = async (req, res, next) => {
  try {
    const board = await Board.findById(req.params.id);

    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }

    req.board = board;

    next();
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const checkBoardAccess = (req, res, next) => {
  const userId = req.user._id.toString();
  const board = req.board;

  const isOwner = board.owner.toString() === userId;
  const isMember = board.members.some((member) => member.toString() === userId);

  if (!isOwner && !isMember) {
    return res.status(403).json({ message: "Not authorized" });
  }

  next();
};

export const checkBoardOwner = (req, res, next) => {
  const userId = req.user._id.toString();

  if (req.board.owner.toString() !== userId) {
    return res.status(403).json({ message: "Only owner can modify board" });
  }

  next();
};

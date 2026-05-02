import mongoose from "mongoose";
import Board from "../models/Board.js";
import User from "../models/User.js";
import { formatBoard } from "../utils/formatters.js";

export const getBoards = async (req, res) => {
  try {
    const boards = await Board.find({
      $or: [{ owner: req.user._id }, { members: req.user._id }],
    })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ boards: boards.map(formatBoard) });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getBoardById = async (req, res) => {
  res.status(200).json({ board: formatBoard(req.board) });
};

export const createBoard = async (req, res) => {
  try {
    const { title, description, color, isPrivate } = req.body;

    if (!title) {
      return res.status(400).json({ message: "Title is required" });
    }

    const board = await Board.create({
      title,
      description,
      owner: req.user._id,
      members: [],
      color,
      isPrivate,
    });

    res.status(201).json({ board: formatBoard(board) });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateBoard = async (req, res) => {
  try {
    const { title, description, color, isPrivate } = req.body;

    const board = req.board;

    board.title = title ?? board.title;
    board.description = description ?? board.description;
    board.color = color ?? board.color;
    board.isPrivate = isPrivate ?? board.isPrivate;

    await board.save();

    res.status(200).json({ board: formatBoard(board) });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteBoard = async (req, res) => {
  try {
    await req.board.deleteOne();

    res.status(200).json({ message: "Board deleted successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

//Members functions
export const getBoardMembers = async (req, res) => {
  try {
    const board = req.board;

    res.status(200).json({
      owner: board.owner,
      members: board.members,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const addMember = async (req, res) => {
  try {
    const { memberId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(memberId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const user = await User.findById(memberId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const board = req.board;

    if (board.owner._id.toString() === memberId) {
      return res
        .status(400)
        .json({ message: "Owner is already part of board" });
    }

    const alreadyMember = board.members.some(
      (member) => member._id.toString() === memberId,
    );

    if (alreadyMember) {
      return res.status(400).json({ message: "User already a member" });
    }

    board.members.push(memberId);
    await board.save();

    res.status(200).json({
      message: "Member added successfully",
      board: formatBoard(board),
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const removeMember = async (req, res) => {
  try {
    const { memberId } = req.params;

    const board = req.board;

    if (board._id.owner.toString() === memberId) {
      return res.status(400).json({ message: "Cannot remove board owner" });
    }

    const isMember = board.members.some(
      (member) => member._id.toString() === memberId,
    );

    if (!isMember) {
      return res.status(404).json({ message: "Member not found in board" });
    }

    board.members = board.members.filter(
      (member) => member._id.toString() !== memberId,
    );

    await board.save();

    res.status(200).json({
      message: "Member removed successfully",
      board: formatBoard(board),
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

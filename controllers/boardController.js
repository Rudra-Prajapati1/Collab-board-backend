import Board from "../models/Board.js";

export const getBoards = async (req, res) => {
  try {
    const boards = await Board.find({
      $or: [{ owner: req.user._id }, { members: req.user._id }],
    }).sort({ createdAt: -1 });

    res.status(200).json({ boards });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getBoardById = async (req, res) => {
  res.status(200).json({ board: req.board });
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

    res.status(201).json({ board });
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

    res.status(200).json({ board });
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

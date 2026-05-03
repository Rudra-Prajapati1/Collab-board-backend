import Task from "../models/Task.js";

export const loadTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.taskId).populate(
      "board",
      "owner members",
    );

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    req.task = task;
    req.board = task.board;
    next();
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const checkTaskAccess = async (req, res, next) => {
  try {
    const userId = req.user._id.toString();
    const board = req.board;
    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }

    const isOwner = board.owner._id
      ? board.owner._id.toString() === userId
      : board.owner.toString() === userId;

    const isMember = board.members.some((member) =>
      member._id
        ? member._id.toString() === userId
        : member.toString() === userId,
    );

    if (!isOwner && !isMember) {
      return res.status(403).json({ message: "Not authorized" });
    }

    next();
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const taskAccessMiddleware = [loadTask, checkTaskAccess];

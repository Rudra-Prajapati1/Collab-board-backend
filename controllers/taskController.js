import Task from "../models/Task.js";
import User from "../models/User.js";

export const getTaskByBoard = async (req, res) => {
  try {
    const { id } = req.params;

    Task.find({ board: id, isArchived: false })
      .sort({ status: 1, position: 1 })
      .populate("assignedTo", "name email");

    res.status(200).json({ tasks });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const createTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, priority, dueDate } = req.body;

    if (!title) {
      return res.status(400).json({ message: "Title is required" });
    }

    const lastTask = await Task.findOne({ board: id, status: "pending" }).sort({
      position: -1,
    });

    const position = lastTask ? lastTask.position + 1 : 0;

    const task = await Task.create({
      title,
      description,
      priority,
      dueDate,
      board: id,
      createdBy: req.user._id,
      position,
    });

    res.status(201).json({ task });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateTask = async (req, res) => {
  try {
    const task = req.task;
    const { title, description, priority, dueDate } = req.body;

    task.title = title ?? task.title;
    task.description = description ?? task.description;
    task.priority = priority ?? task.priority;
    task.dueDate = dueDate ?? task.dueDate;

    await task.save();

    res.status(200).json({ task });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteTask = async (req, res) => {
  try {
    await req.task.deleteOne();

    res.status(200).json({ message: "Task deleted successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateTaskStatus = async (req, res) => {
  try {
    const task = req.task;
    const { status } = req.body;

    if (!["pending", "inProgress", "done"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const lastTask = await Task.findOne({
      board: task.board,
      status,
    }).sort({ position: -1 });

    task.status = status;
    task.position = lastTask ? lastTask.position + 1 : 0;

    await task.save();

    res.status(200).json({ task });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const assignTask = async (req, res) => {
  try {
    const { userId } = req.body;
    const task = req.task;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    task.assignedTo = userId;
    await task.save();

    res.status(200).json({ task });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const reorderTask = async (req, res) => {
  try {
    const { newPosition } = req.body;
    const task = req.task;

    if (newPosition === undefined || newPosition < 0) {
      return res.status(400).json({ message: "Invalid position" });
    }

    const oldPosition = task.position;

    if (oldPosition === newPosition) {
      return res.status(200).json({ task });
    }

    const boardId = task.board._id || task.board;
    const status = task.status;

    if (oldPosition < newPosition) {
      await Task.updateMany(
        {
          board: boardId,
          status,
          position: { $gt: oldPosition, $lte: newPosition },
        },
        { $inc: { position: -1 } },
      );
    } else {
      await Task.updateMany(
        {
          board: boardId,
          status,
          position: { $gte: newPosition, $lt: oldPosition },
        },
        { $inc: { position: 1 } },
      );
    }

    task.position = newPosition;
    await task.save();

    res.status(200).json({ task });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const toggleArchiveTask = async (req, res) => {
  try {
    const task = req.task;

    task.isArchived = !task.isArchived;
    await task.save();

    res.status(200).json({ task });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

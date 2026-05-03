import Task from "../models/Task.js";
import User from "../models/User.js";

const withSession = (query, session) =>
  session ? query.session(session) : query;

const getBoardId = (task) => task.board._id || task.board;

const saveTaskDocument = (task, session) =>
  session ? task.save({ session }) : task.save();

const deleteTaskDocument = (task, session) =>
  session ? task.deleteOne({ session }) : task.deleteOne();

const createTaskDocument = async (taskData, session) => {
  if (!session) {
    return Task.create(taskData);
  }

  const [task] = await Task.create([taskData], { session });
  return task;
};

const getActiveTaskQuery = (boardId, status, extra = {}) => ({
  board: boardId,
  status,
  isArchived: false,
  ...extra,
});

const getNextTaskPosition = async ({
  session,
  boardId,
  status,
  excludeTaskId,
}) => {
  const lastTaskQuery = Task.findOne(
    getActiveTaskQuery(
      boardId,
      status,
      excludeTaskId ? { _id: { $ne: excludeTaskId } } : {},
    ),
  ).sort({ position: -1 });

  const lastTask = await withSession(lastTaskQuery, session);
  return lastTask ? lastTask.position + 1 : 0;
};

const closeTaskPositionGap = async ({
  session,
  boardId,
  status,
  position,
  excludeTaskId,
}) => {
  await Task.updateMany(
    getActiveTaskQuery(boardId, status, {
      position: { $gt: position },
      ...(excludeTaskId ? { _id: { $ne: excludeTaskId } } : {}),
    }),
    { $inc: { position: -1 } },
    session ? { session } : {},
  );
};

const runTaskMutation = async (work) => {
  const session = await Task.startSession();

  try {
    try {
      session.startTransaction();
      const result = await work(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }

      const transactionUnsupported =
        error?.message?.includes(
          "Transaction numbers are only allowed on a replica set member or mongos",
        ) ||
        error?.message?.includes(
          "Standalone servers do not support transactions",
        );

      if (!transactionUnsupported) {
        throw error;
      }

      return await work(null);
    }
  } finally {
    await session.endSession();
  }
};

const handleTaskError = (res, error) => {
  console.log(error);

  if (error?.code === 11000 && error?.keyPattern?.position) {
    return res
      .status(409)
      .json({ message: "Task order changed. Please retry the request." });
  }

  return res.status(500).json({ message: "Server error" });
};

export const getTaskByBoard = async (req, res) => {
  try {
    const { id } = req.params;

    const tasks = await Task.find({ board: id, isArchived: false })
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

    const task = await runTaskMutation(async (session) => {
      const position = await getNextTaskPosition({
        session,
        boardId: id,
        status: "pending",
      });

      return createTaskDocument(
        {
          title,
          description,
          priority,
          dueDate,
          board: id,
          createdBy: req.user._id,
          position,
        },
        session,
      );
    });

    res.status(201).json({ task });
  } catch (error) {
    return handleTaskError(res, error);
  }
};

export const updateTask = async (req, res) => {
  try {
    const task = req.task;
    const { title, description, priority, dueDate } = req.body;

    if (title !== undefined && !title.trim()) {
      return res.status(400).json({ message: "Title cannot be empty" });
    }

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
    const task = req.task;
    const boardId = getBoardId(task);

    await runTaskMutation(async (session) => {
      if (!task.isArchived) {
        await closeTaskPositionGap({
          session,
          boardId,
          status: task.status,
          position: task.position,
          excludeTaskId: task._id,
        });
      }

      await deleteTaskDocument(task, session);
    });

    res.status(200).json({ message: "Task deleted successfully" });
  } catch (error) {
    return handleTaskError(res, error);
  }
};

export const updateTaskStatus = async (req, res) => {
  try {
    const task = req.task;
    const { status } = req.body;

    if (!["pending", "inProgress", "done"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    if (task.status === status) {
      return res.status(200).json({ task });
    }

    const boardId = getBoardId(task);

    const oldStatus = task.status;
    const oldPosition = task.position;

    await runTaskMutation(async (session) => {
      if (!task.isArchived) {
        await closeTaskPositionGap({
          session,
          boardId,
          status: oldStatus,
          position: oldPosition,
          excludeTaskId: task._id,
        });
      }

      task.status = status;

      if (!task.isArchived) {
        task.position = await getNextTaskPosition({
          session,
          boardId,
          status,
          excludeTaskId: task._id,
        });
      }

      await saveTaskDocument(task, session);
    });

    res.status(200).json({ task });
  } catch (error) {
    return handleTaskError(res, error);
  }
};

export const assignTask = async (req, res) => {
  try {
    const { userId } = req.body;
    const task = req.task;

    const user = await User.findById(userId);
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMember = req.board.members.some((member) => {
      const id = member._id ? member._id.toString() : member.toString();
      return id === userId;
    });

    const ownerId = req.board.owner._id
      ? req.board.owner._id.toString()
      : req.board.owner.toString();

    const isOwner = ownerId === userId;

    if (!isMember && !isOwner) {
      return res.status(400).json({ message: "User not in board" });
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
    const parsedPosition = Number(req.body.newPosition);
    const task = req.task;

    if (task.isArchived) {
      return res
        .status(400)
        .json({ message: "Archived tasks cannot be reordered" });
    }

    if (!Number.isInteger(parsedPosition) || parsedPosition < 0) {
      return res.status(400).json({ message: "Invalid position" });
    }

    const oldPosition = task.position;
    const newPosition = parsedPosition;

    if (oldPosition === newPosition) {
      return res.status(200).json({ task });
    }

    const boardId = getBoardId(task);
    const status = task.status;

    const totalTasks = await Task.countDocuments({
      board: boardId,
      status,
      isArchived: false,
    });

    if (newPosition > totalTasks - 1) {
      return res.status(400).json({ message: "Invalid position" });
    }

    await runTaskMutation(async (session) => {
      if (oldPosition < newPosition) {
        await Task.updateMany(
          {
            board: boardId,
            status,
            position: { $gt: oldPosition, $lte: newPosition },
            isArchived: false,
            _id: { $ne: task._id },
          },
          { $inc: { position: -1 } },
          session ? { session } : {},
        );
      } else {
        await Task.updateMany(
          {
            board: boardId,
            status,
            position: { $gte: newPosition, $lt: oldPosition },
            isArchived: false,
            _id: { $ne: task._id },
          },
          { $inc: { position: 1 } },
          session ? { session } : {},
        );
      }

      task.position = newPosition;
      await saveTaskDocument(task, session);
    });

    res.status(200).json({ task });
  } catch (error) {
    return handleTaskError(res, error);
  }
};

export const toggleArchiveTask = async (req, res) => {
  try {
    const task = req.task;
    const boardId = getBoardId(task);

    await runTaskMutation(async (session) => {
      if (task.isArchived) {
        task.position = await getNextTaskPosition({
          session,
          boardId,
          status: task.status,
        });
        task.isArchived = false;
      } else {
        await closeTaskPositionGap({
          session,
          boardId,
          status: task.status,
          position: task.position,
          excludeTaskId: task._id,
        });
        task.isArchived = true;
      }

      await saveTaskDocument(task, session);
    });

    res.status(200).json({ task });
  } catch (error) {
    return handleTaskError(res, error);
  }
};

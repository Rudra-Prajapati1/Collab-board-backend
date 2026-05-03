import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  checkBoardAccess,
  loadBoard,
  validateObjectId,
} from "../middleware/boardMiddleware.js";
import {
  assignTask,
  createTask,
  deleteTask,
  getTaskByBoard,
  reorderTask,
  toggleArchiveTask,
  updateTask,
  updateTaskStatus,
} from "../controllers/taskController.js";
import { taskAccessMiddleware } from "../middleware/taskMiddleware.js";

const taskRouter = express.Router();

taskRouter.use(protect);

taskRouter
  .route("/boards/:id/tasks")
  .get(validateObjectId("id"), loadBoard, checkBoardAccess, getTaskByBoard)
  .post(validateObjectId("id"), loadBoard, checkBoardAccess, createTask);

taskRouter.use(
  "/tasks/:taskId",
  validateObjectId("taskId"),
  ...taskAccessMiddleware,
);

taskRouter.route("/tasks/:taskId").patch(updateTask).delete(deleteTask);

taskRouter.patch("/tasks/:taskId/status", updateTaskStatus);

taskRouter.patch("/tasks/:taskId/assign", assignTask);

taskRouter.patch("/tasks/:taskId/reorder", reorderTask);

taskRouter.patch("/tasks/:taskId/archive", toggleArchiveTask);

export default taskRouter;

import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createBoard,
  deleteBoard,
  getBoardById,
  getBoards,
  updateBoard,
} from "../controllers/boardController.js";
import {
  checkBoardAccess,
  checkBoardOwner,
  loadBoard,
  validateObjectId,
} from "../middleware/boardMiddleware.js";

const boardRouter = express.Router();

boardRouter.use(protect);
boardRouter.use("/:id", validateObjectId, loadBoard);

boardRouter.route("/").get(getBoards).post(createBoard);
boardRouter
  .route("/:id")
  .get(checkBoardAccess, getBoardById)
  .patch(checkBoardOwner, updateBoard)
  .delete(checkBoardOwner, deleteBoard);

export default boardRouter;

import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  addMember,
  createBoard,
  deleteBoard,
  getBoardById,
  getBoardMembers,
  getBoards,
  removeMember,
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
boardRouter.use("/board/:id", validateObjectId("id"), loadBoard);

boardRouter.route("/board").get(getBoards).post(createBoard);
boardRouter
  .route("/board/:id")
  .get(checkBoardAccess, getBoardById)
  .patch(checkBoardOwner, updateBoard)
  .delete(checkBoardOwner, deleteBoard);

//Member routes
boardRouter
  .route("/board/:id/members")
  .get(checkBoardAccess, getBoardMembers)
  .post(checkBoardOwner, addMember);

boardRouter
  .route("/board/:id/members/:memberId")
  .delete(validateObjectId("memberId"), checkBoardOwner, removeMember);

export default boardRouter;

import express from "express";
import { getUser, login, register } from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const authRouter = express.Router();

authRouter.post("/login", login);
authRouter.post("/register", register);
authRouter.get("/me", protect, getUser);

export default authRouter;

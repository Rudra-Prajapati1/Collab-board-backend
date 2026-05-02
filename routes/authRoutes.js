import express from "express";
import { getUser, login, register } from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const authRouter = express.Router();

authRouter.post("/auth/login", login);
authRouter.post("/auth/register", register);
authRouter.get("/auth/me", protect, getUser);

export default authRouter;

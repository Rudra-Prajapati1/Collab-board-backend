import "dotenv/config.js";
import express from "express";
import cors from "cors";
// import http from "http";
// import { Server } from "socket.io";
// import initSocket from "./socket/socket";
import connectDB from "./config/db.js";
import authRouter from "./routes/authRoute.js";
import requestLogger from "./middleware/requestLogger.js";

connectDB();

const app = express();
// const httpServer = http.createServer(app);

// const io = new Server(httpServer, {
//   cors: {
//     origin: process.env.CLIENT_URL,
//     methods: ["GET", "POST"],
//   },
// });

app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());
app.use(requestLogger);

app.get("/", (req, res) => {
  res.status(200).send("Server is live!");
});

app.get("/health", (req, res) => {
  res.status(200).send("Server is runnig fine.!");
});

app.use("/api/auth", authRouter);

const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Server is running on PORT ${PORT}`);
});

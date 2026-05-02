import mongoose from "mongoose";

const boardSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Board title is required"],
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    members: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
    color: {
      type: String,
      default: "#6366f1",
      match: [/^#([0-9A-F]{3}){1,2}$/i, "Invalid color format"],
    },
    isPrivate: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

const Board = mongoose.model("Board", boardSchema);
export default Board;

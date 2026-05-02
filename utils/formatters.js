export const formatBoard = (board) => ({
  id: board._id.toString(),
  title: board.title,
  description: board.description,
  color: board.color,
  isPrivate: board.isPrivate,
  owner: board.owner,
  members: board.members,
});

const ChatMessage = require("../../models/ChatMessage");
const StudyGroup = require("../../models/StudyGroup");
const { sendSuccess, sendError } = require("../../utils/apiResponse");

const isMember = (group, userId) =>
  group.members.some((m) => String(m.user) === String(userId));

const getMessages = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { before, limit = 50 } = req.query;

    const group = await StudyGroup.findById(groupId).select("members");
    if (!group) return sendError(res, "Study group not found", 404);
    if (!isMember(group, req.user._id)) return sendError(res, "Not a member of this group", 403);

    const query = { group: groupId };
    if (before) query.createdAt = { $lt: new Date(before) };

    const messages = await ChatMessage.find(query)
      .sort({ createdAt: -1 })
      .limit(Math.min(Number(limit) || 50, 100))
      .populate("sender", "name")
      .lean();

    return sendSuccess(res, "Messages fetched", { messages: messages.reverse() }, 200);
  } catch (error) {
    next(error);
  }
};

const sendMessage = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { content } = req.body;

    if (!content?.trim()) return sendError(res, "Message content is required", 400);

    const group = await StudyGroup.findById(groupId).select("members");
    if (!group) return sendError(res, "Study group not found", 404);
    if (!isMember(group, req.user._id)) return sendError(res, "Not a member of this group", 403);

    const msg = await ChatMessage.create({
      group: groupId,
      sender: req.user._id,
      content: content.trim(),
    });

    const populated = await ChatMessage.findById(msg._id).populate("sender", "name").lean();

    return sendSuccess(res, "Message sent", { message: populated }, 201);
  } catch (error) {
    next(error);
  }
};

module.exports = { getMessages, sendMessage };

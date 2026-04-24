const path = require("path");
const fs = require("fs");
const StudyGroup = require("../../models/StudyGroup");
const { sendSuccess, sendError } = require("../../utils/apiResponse");
const crypto = require("crypto");

const MAX_DESCRIPTION_WORDS = 20;
const countWords = (value = "") =>
  String(value)
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

const createStudyGroup = async (req, res, next) => {
  try {
    const {
      name,
      subject,
      description = "",
      roomBookingNote = "",
      maxMembers,
      location,
      sessionTime,
      targetStudyYear,
      targetSemester,
    } = req.body;

    const parsedMaxMembers = Number(maxMembers);
    const parsedSessionTime = new Date(sessionTime);
    const parsedYear = Number(targetStudyYear);
    const parsedSemester = Number(targetSemester);

    if (countWords(description) > MAX_DESCRIPTION_WORDS) {
      return sendError(res, `Description must be ${MAX_DESCRIPTION_WORDS} words or less`, 400);
    }

    if (!Number.isFinite(parsedMaxMembers) || parsedMaxMembers < 1) {
      return sendError(res, "maxMembers must be a number >= 1", 400);
    }

    if (Number.isNaN(parsedSessionTime.getTime())) {
      return sendError(res, "sessionTime must be a valid date/time", 400);
    }

    if (!Number.isFinite(parsedYear) || parsedYear < 1 || parsedYear > 4) {
      return sendError(res, "targetStudyYear must be between 1 and 4", 400);
    }

    if (!Number.isFinite(parsedSemester) || (parsedSemester !== 1 && parsedSemester !== 2)) {
      return sendError(res, "targetSemester must be 1 or 2", 400);
    }

    const group = await StudyGroup.create({
      name,
      subject,
      description,
      roomBookingNote,
      maxMembers: parsedMaxMembers,
      location,
      sessionTime: parsedSessionTime,
      targetStudyYear: parsedYear,
      targetSemester: parsedSemester,
      createdBy: req.user._id,
      members: [{ user: req.user._id, role: "owner" }],
    });
    return sendSuccess(res, "Study group created", { group }, 201);
  } catch (error) {
    next(error);
  }
};

const getStudyGroups = async (req, res, next) => {
  try {
    const query = {};
    if (req.user.role === "student") {
      if (!req.user.studyYear || !req.user.semester) {
        return sendError(
          res,
          "Please update your profile with study year and semester to view study groups",
          400
        );
      }
      query.targetStudyYear = Number(req.user.studyYear);
      query.targetSemester = Number(req.user.semester);
    }

    const groups = await StudyGroup.find(query)
      .populate("createdBy", "name")
      .populate("members.user", "name")
      .sort({ createdAt: -1 });
    return sendSuccess(res, "Study groups fetched", { groups }, 200);
  } catch (error) {
    next(error);
  }
};

const getStudyGroupById = async (req, res, next) => {
  try {
    const group = await StudyGroup.findById(req.params.groupId)
      .populate("createdBy", "name email")
      .populate("members.user", "name email")
      .populate("tasks.assignedTo", "name")
      .populate("notes.uploadedBy", "name")
      .populate("materials.uploadedBy", "name")
      .populate("feedbacks.user", "name email");
    if (!group) return sendError(res, "Study group not found", 404);

    if (req.user.role === "student") {
      const userYear = Number(req.user.studyYear);
      const userSemester = Number(req.user.semester);
      if (!userYear || !userSemester) {
        return sendError(res, "Please update your profile with study year and semester", 400);
      }
      if (group.targetStudyYear !== userYear || group.targetSemester !== userSemester) {
        return sendError(res, "You are not allowed to view this group", 403);
      }
    }

    return sendSuccess(res, "Study group fetched", { group }, 200);
  } catch (error) {
    next(error);
  }
};

const addGroupFeedback = async (req, res, next) => {
  try {
    const { type, message } = req.body;
    const group = await StudyGroup.findById(req.params.groupId);
    if (!group) return sendError(res, "Study group not found", 404);

    const isMember = group.members.some((member) => String(member.user) === String(req.user._id));
    if (!isMember) return sendError(res, "Join this group before submitting feedback", 403);

    group.feedbacks.push({
      user: req.user._id,
      type,
      message,
    });
    await group.save();

    const updated = await StudyGroup.findById(req.params.groupId).populate("feedbacks.user", "name email");
    return sendSuccess(res, "Feedback submitted", { feedbacks: updated.feedbacks }, 201);
  } catch (error) {
    next(error);
  }
};

const getAllGroupFeedbackForAdmin = async (req, res, next) => {
  try {
    const groups = await StudyGroup.find({ "feedbacks.0": { $exists: true } })
      .select("name subject createdBy feedbacks")
      .populate("createdBy", "name email")
      .populate("feedbacks.user", "name email")
      .sort({ updatedAt: -1 });

    return sendSuccess(res, "Group feedback fetched", { groups }, 200);
  } catch (error) {
    next(error);
  }
};

const joinStudyGroup = async (req, res, next) => {
  try {
    const group = await StudyGroup.findById(req.params.groupId);
    if (!group) return sendError(res, "Study group not found", 404);

    const alreadyMember = group.members.some((member) => String(member.user) === String(req.user._id));
    if (alreadyMember) return sendError(res, "You already joined this group", 400);

    if (group.members.length >= group.maxMembers) {
      return sendError(res, "Study group is full", 400);
    }

    if (req.user.role === "student") {
      const userYear = Number(req.user.studyYear);
      const userSemester = Number(req.user.semester);
      if (!userYear || !userSemester) {
        return sendError(res, "Update your profile with study year and semester before joining", 400);
      }

      if (group.targetStudyYear !== userYear || group.targetSemester !== userSemester) {
        return sendError(res, "You can only join groups for your year and semester", 403);
      }
    }

    group.members.push({ user: req.user._id, role: "member" });
    await group.save();
    return sendSuccess(res, "Joined study group successfully", { group }, 200);
  } catch (error) {
    next(error);
  }
};

const addTaskToGroup = async (req, res, next) => {
  try {
    const { title, assignedTo = null, dueDate = null } = req.body;
    const group = await StudyGroup.findById(req.params.groupId);
    if (!group) return sendError(res, "Study group not found", 404);

    group.tasks.push({ title, assignedTo, dueDate });
    await group.save();
    return sendSuccess(res, "Task added to group", { tasks: group.tasks }, 201);
  } catch (error) {
    next(error);
  }
};

const updateTaskStatus = async (req, res, next) => {
  try {
    const { groupId, taskId } = req.params;
    const { status } = req.body;

    const group = await StudyGroup.findById(groupId);
    if (!group) return sendError(res, "Study group not found", 404);

    const task = group.tasks.id(taskId);
    if (!task) return sendError(res, "Task not found", 404);

    task.status = status;
    await group.save();
    return sendSuccess(res, "Task status updated", { task }, 200);
  } catch (error) {
    next(error);
  }
};

const addSharedNote = async (req, res, next) => {
  try {
    const { title, content = "" } = req.body;
    const group = await StudyGroup.findById(req.params.groupId);
    if (!group) return sendError(res, "Study group not found", 404);

    group.notes.push({
      title,
      content,
      uploadedBy: req.user._id,
    });
    await group.save();
    return sendSuccess(res, "Shared note added", { notes: group.notes }, 201);
  } catch (error) {
    next(error);
  }
};

const updateSharedNote = async (req, res, next) => {
  try {
    const { groupId, noteId } = req.params;
    const { title, content } = req.body;

    const group = await StudyGroup.findById(groupId);
    if (!group) return sendError(res, "Study group not found", 404);

    const note = group.notes.id(noteId);
    if (!note) return sendError(res, "Note not found", 404);

    if (title !== undefined) note.title = title;
    if (content !== undefined) note.content = content;
    note.uploadedBy = req.user._id;
    await group.save();

    const updated = await StudyGroup.findById(groupId).populate("notes.uploadedBy", "name");
    return sendSuccess(res, "Note updated", { notes: updated.notes }, 200);
  } catch (error) {
    next(error);
  }
};

const deleteSharedNote = async (req, res, next) => {
  try {
    const { groupId, noteId } = req.params;
    const group = await StudyGroup.findById(groupId);
    if (!group) return sendError(res, "Study group not found", 404);

    const note = group.notes.id(noteId);
    if (!note) return sendError(res, "Note not found", 404);

    note.deleteOne();
    await group.save();
    return sendSuccess(res, "Note deleted", { notes: group.notes }, 200);
  } catch (error) {
    next(error);
  }
};

const markAttendance = async (req, res, next) => {
  try {
    const { sessionDate, presentMembers = [] } = req.body;
    const group = await StudyGroup.findById(req.params.groupId);
    if (!group) return sendError(res, "Study group not found", 404);

    group.attendance.push({
      sessionDate: sessionDate ? new Date(sessionDate) : new Date(),
      presentMembers,
    });
    await group.save();
    return sendSuccess(res, "Attendance marked", { attendance: group.attendance }, 201);
  } catch (error) {
    next(error);
  }
};

const updateRoomBookingPlaceholder = async (req, res, next) => {
  try {
    const { roomBookingNote = "" } = req.body;
    const group = await StudyGroup.findById(req.params.groupId);
    if (!group) return sendError(res, "Study group not found", 404);

    group.roomBookingNote = roomBookingNote;
    await group.save();
    return sendSuccess(res, "Room booking placeholder updated", { group }, 200);
  } catch (error) {
    next(error);
  }
};

const uploadMaterial = async (req, res, next) => {
  try {
    const group = await StudyGroup.findById(req.params.groupId);
    if (!group) return sendError(res, "Study group not found", 404);

    if (!req.file) {
      return sendError(res, "No file uploaded. Allowed types: PDF, Word, PowerPoint (max 10 MB)", 400);
    }

    const category = req.body.category || "other";

    group.materials.push({
      originalName: req.file.originalname,
      filename: req.file.filename,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      uploadedBy: req.user._id,
      category,
    });

    await group.save();
    return sendSuccess(res, "Material uploaded successfully", { materials: group.materials }, 201);
  } catch (error) {
    next(error);
  }
};

const deleteMaterial = async (req, res, next) => {
  try {
    const { groupId, materialId } = req.params;
    const group = await StudyGroup.findById(groupId);
    if (!group) return sendError(res, "Study group not found", 404);

    const material = group.materials.id(materialId);
    if (!material) return sendError(res, "Material not found", 404);

    const filePath = path.join(__dirname, "..", "..", "uploads", material.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    material.deleteOne();
    await group.save();
    return sendSuccess(res, "Material deleted", { materials: group.materials }, 200);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createStudyGroup,
  getStudyGroups,
  getStudyGroupById,
  joinStudyGroup,
  addTaskToGroup,
  updateTaskStatus,
  addSharedNote,
  updateSharedNote,
  deleteSharedNote,
  markAttendance,
  updateRoomBookingPlaceholder,
  createOnlineMeeting,
  uploadMaterial,
  deleteMaterial,
  addGroupFeedback,
  getAllGroupFeedbackForAdmin,
};

async function createOnlineMeeting(req, res, next) {
  try {
    const { scheduledAt = null } = req.body;
    const group = await StudyGroup.findById(req.params.groupId);
    if (!group) return sendError(res, "Study group not found", 404);

    const isMember = group.members.some((member) => String(member.user) === String(req.user._id));
    if (!isMember) return sendError(res, "Only group members can create meetings", 403);

    const slug = String(group.name || "study-group")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 40);
    const roomName = `${slug || "group"}-${crypto.randomBytes(3).toString("hex")}`;
    const meetingUrl = `https://meet.jit.si/${roomName}`;

    group.onlineMeeting = {
      provider: "jitsi",
      roomName,
      meetingUrl,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      createdBy: req.user._id,
      createdAt: new Date(),
      isActive: true,
    };

    await group.save();
    return sendSuccess(res, "Online meeting created", { onlineMeeting: group.onlineMeeting }, 201);
  } catch (error) {
    next(error);
  }
}

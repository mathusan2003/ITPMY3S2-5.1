const express = require("express");
const { protect } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/authMiddleware");
const upload = require("../../config/multerConfig");
const {
  validateCreateGroup,
  validateCreateTask,
  validateCreateNote,
  validateGroupFeedback,
  validateCreateOnlineMeeting,
} = require("../../validations/groupStudyValidation");
const {
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
} = require("../../controllers/groupStudy/groupStudyController");
const { getMessages, sendMessage } = require("../../controllers/groupStudy/chatController");

const router = express.Router();

router.post("/", protect, validateCreateGroup, createStudyGroup);
router.get("/", protect, getStudyGroups);
router.get("/admin/feedback", protect, authorizeRoles("admin"), getAllGroupFeedbackForAdmin);
router.get("/:groupId", protect, getStudyGroupById);
router.post("/:groupId/join", protect, joinStudyGroup);
router.post("/:groupId/tasks", protect, validateCreateTask, addTaskToGroup);
router.patch("/:groupId/tasks/:taskId", protect, updateTaskStatus);
router.post("/:groupId/notes", protect, validateCreateNote, addSharedNote);
router.patch("/:groupId/notes/:noteId", protect, updateSharedNote);
router.delete("/:groupId/notes/:noteId", protect, deleteSharedNote);
router.post("/:groupId/attendance", protect, markAttendance);
router.patch("/:groupId/room-booking", protect, updateRoomBookingPlaceholder);
router.post("/:groupId/online-meeting", protect, validateCreateOnlineMeeting, createOnlineMeeting);
router.post("/:groupId/materials", protect, upload.single("file"), uploadMaterial);
router.delete("/:groupId/materials/:materialId", protect, deleteMaterial);
router.post("/:groupId/feedback", protect, validateGroupFeedback, addGroupFeedback);

// Chat routes
router.get("/:groupId/messages", protect, getMessages);
router.post("/:groupId/messages", protect, sendMessage);

module.exports = router;

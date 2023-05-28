const express = require("express");
const {
  loginHandler,
  registerHandler,
  logoutHandler,
  resetPasswordHandler,
} = require("../controllers/auth.contoller");
const { deserializeUser } = require("../middleware/deserializeUser");
const { requireUser } = require("../middleware/requireUser");
const { validate } = require("../middleware/validate");
const {
  createStudentSchema,
  loginStudentSchema,
} = require("../schema/student.schema");

const { passwordResetSchema } = require("../schema/passwordReset.schema");
const { restrictTo } = require("../middleware/restrictTo");

const router = express.Router();

// Register can be done only by admin and we input the admin credential inside the system
// Register user route
// router.post("/register", validate(createStudentSchema), registerHandler);

// Login user route
router.post("/login", validate(loginStudentSchema), loginHandler);

// This is deserialze middleware it checks for user have valid session and have appropriate tokens.
router.use(deserializeUser, requireUser);
// Add student or admin
router.post(
  "/register",
  restrictTo("admin"),
  validate(createStudentSchema),
  registerHandler
);

router.put(
  "/reset-password",
  validate(passwordResetSchema),
  resetPasswordHandler
);

// Logout User
router.get("/logout", logoutHandler);

module.exports = router;

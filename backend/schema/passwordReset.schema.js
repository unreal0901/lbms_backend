const { object, string } = require("zod");

module.exports.passwordResetSchema = object({
  body: object({
    oldPassword: string().min(10, {
      message: "Old password must be at least 10 characters",
    }),
    newPassword: string().min(10, {
      message: "New password must be at least 10 characters",
    }),
    confirmPassword: string().min(10, {
      message: "Confirm password must be at least 10 characters",
    }),
  }).refine((data) => data.newPassword === data.confirmPassword, {
    message: "New password and confirm password must match",
    path: ["body", "confirmPassword"],
  }),
});

const { omit } = require("lodash");
// const { FilterQuery, QueryOptions, UpdateQuery } = require("mongoose");
const config = require("config");
const studentModel = require("../models/student.model");
const { excludedFields } = require("../utils/excludedFields");
const { signJwt } = require("../utils/jwt");
const redisClient = require("../utils/connectRedis");
const AppError = require("../utils/appError");
// const { DocumentType } = require("@typegoose/typegoose");

// CreateUser service
const createUser = async (input) => {
  return studentModel.create(input);
};

// Find User by Id
const findUserById = async (id) => {
  const user = await studentModel.findById(id).lean();
  return omit(user, excludedFields);
};

// Find All users
const findAllUsers = async () => {
  return await studentModel.find();
};

// Find one user by any fields
const findUser = async (query, options = {}) => {
  return await studentModel.findOne(query, {}, options).select("+password");
};

const findAndUpdateUser = async (query, update, options) => {
  return await studentModel.findOneAndUpdate(query, update, options);
};

// Sign Token
const signToken = async (user) => {
  // Sign the access token
  const access_token = signJwt({ sub: user._id }, "accessTokenPrivateKey", {
    expiresIn: `${config.get("accessTokenExpiresIn")}m`,
  });
  // Sign the refresh token
  const refresh_token = signJwt({ sub: user._id }, "refreshTokenPrivateKey", {
    expiresIn: `${config.get("refreshTokenExpiresIn")}m`,
  });

  // Create a Session
  redisClient.set(user._id.toString(), JSON.stringify(user), {
    EX: 60 * 60,
  });

  // Return access token
  return { access_token, refresh_token };
};

const resetPass = async (userId, oldPassword, newPassword) => {
  // Find the student by their ID
  const student = await studentModel.findById(userId);

  // Check if the old password matches the stored password
  const isMatch = await student.comparePasswords(student.password, oldPassword);

  if (!isMatch) {
    // Old password does not match
    throw new AppError("Invalid old password", 401);
  }

  // Update the password with the new password
  student.password = newPassword;

  // Save the updated student object
  await student.save();
};

const userExist = async (email) => {
  const user = await studentModel.find({ email }).lean();
  console.log(user);
  if (user.length > 0) return true;
  else return false;
};

module.exports = {
  createUser,
  findUserById,
  findAllUsers,
  findUser,
  findAndUpdateUser,
  signToken,
  resetPass,
  userExist,
};

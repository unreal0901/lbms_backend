const config = require("config");
const {
  createUser,
  findUser,
  findUserById,
  signToken,
  resetPass,
  userExist,
} = require("../services/auth.service");
const AppError = require("../utils/appError");
const redisClient = require("../utils/connectRedis");
const Email = require("../utils/email");
// const { signJwt, verifyJwt } = require("../utils/jwt");

// Exclude this fields from the response
// module.exports.excludedFields = ["password"];

// Cookie options
const accessTokenCookieOptions = {
  expires: new Date(
    Date.now() + config.get("accessTokenExpiresIn") * 60 * 1000
  ),
  maxAge: config.get("accessTokenExpiresIn") * 60 * 1000,
  httpOnly: true,
  sameSite: "none",
};

const refreshTokenCookieOptions = {
  expires: new Date(
    Date.now() + config.get("refreshTokenExpiresIn") * 60 * 1000
  ),
  maxAge: config.get("refreshTokenExpiresIn") * 60 * 1000,
  httpOnly: true,
  sameSite: "none",
};

// Only set secure to true in production
if (config.get("deployStage") === "production") {
  accessTokenCookieOptions.secure = true;
  refreshTokenCookieOptions.secure = true;
}

module.exports.registerHandler = async (req, res, next) => {
  try {
    const emailExist = await userExist(req.body.email);
    if (emailExist) {
      throw new AppError("Email already Exists");
    }
    const user = await createUser({
      email: req.body.email,
      fullName: req.body.fullName,
    });

    const generatedPassword = user.createPassword();
    await user.save({ validateBeforeSave: false });

    // Send Verification Email
    const PASSWORD = `${generatedPassword}`;

    try {
      await new Email(user, PASSWORD).sendPassword();

      res.status(201).json({
        status: "success",
        message: "An email with a password is sent to the user",
      });
    } catch (error) {
      user.password = null;
      await user.save({ validateBeforeSave: false });

      if (user.password) user.remove();

      return res.status(500).json({
        status: "error",
        message: "There was an error sending email, please try again",
      });
    }
  } catch (err) {
    console.log(err);
    if (err.code === 11000) {
      return res.status(409).json({
        status: "fail",
        message: "Email already exist",
      });
    }
    next(err);
  }
};

module.exports.loginHandler = async (req, res, next) => {
  try {
    // Get the user from the collection
    const user = await findUser({ email: req.body.email });
    // Check if user exist and password is correct
    if (
      !user ||
      !(await user.comparePasswords(user.password, req.body.password))
    ) {
      return next(new AppError("Invalid email or password", 401));
    }
    // Create the Access and refresh Tokens
    const { access_token, refresh_token } = await signToken(user);

    // Send Access Token in Cookie
    res.cookie("access_token", access_token, accessTokenCookieOptions);
    res.cookie("refresh_token", refresh_token, refreshTokenCookieOptions);
    res.cookie("logged_in", true, {
      ...accessTokenCookieOptions,
      httpOnly: false,
      secure: false,
      path: "/",
    });

    // Send Access Token
    res.status(200).json({
      status: "success",
      access_token,
    });
  } catch (err) {
    next(err);
  }
};

const logout = (res) => {
  res.cookie("access_token", "", { maxAge: 1 });
  res.cookie("refresh_token", "", { maxAge: 1 });
  res.cookie("logged_in", "", { maxAge: 1 });
};

module.exports.logoutHandler = async (req, res, next) => {
  try {
    const user = res.locals.user;
    await redisClient.del(user._id.toString());
    logout(res);
    res.status(200).json({ status: "success" });
  } catch (err) {
    console.log(err);
    next(err);
  }
};

module.exports.resetPasswordHandler = async (req, res, next) => {
  const { oldPassword, newPassword } = req.body;
  const userId = res.locals.user._id;

  try {
    await resetPass(userId, oldPassword, newPassword);
    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    next(error);
  }
};

const express = require("express");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const {
  CREATE_USER,
  GET_USER_BY_EMAIL,
  SET_USER_REFRESH_TOKEN,
  GET_USER_BY_REFRESH_TOKEN,
  REMOVE_USER_REFRESH_TOKEN,
} = require("./hasuraOperations/h_operations");
const executeQuery = require("./executeQuery");
const {
  generateRefreshToken,
  generateAccessToken,
} = require("./generateTokens");
require("dotenv").config();
const bodyParser = require("body-parser");
const imgbbUploader = require("imgbb-uploader");

const app = express();
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
app.use(express.json());
app.use(cookieParser());

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Credentials", true);
  next();
});
app.use(cors({ origin: true, credentials: true }));

app.post("/fileUpload", async (req, res) => {
  try {
    const { filename, base64img } = req.body;

    const base64str = () =>
      new Promise((resolve) => {
        return setTimeout(() => {
          resolve(base64img);
        }, 1000);
      });

    return await imgbbUploader({
      apiKey: process.env.imgBB_KEY,
      base64string: await base64str(),
      name: filename,
      timeout: 3000,
    })
      .then((result) => {
        return res.json({ success: true, imgUrl: result.url });
      })
      .catch((e) => {
        // return Difault image in case of Time Out
        return res.json({
          success: false,
          imgUrl:
            "https://cdn.pixabay.com/photo/2017/03/27/13/54/bread-2178874__340.jpg",
        });
      });
  } catch (error) {
    return res.json({
      success: false,
      imgUrl:
        "https://cdn.pixabay.com/photo/2017/03/27/13/54/bread-2178874__340.jpg",
    });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const { data, errors } = await executeQuery(
    {
      email,
    },
    GET_USER_BY_EMAIL
  );

  if (errors) return res.json({ success: false, error: errors });

  if (data.user.length == 0)
    return res.json({
      success: false,
      error: "User with email '" + email + "' does not exist",
    });

  const hashedPassword = data.user[0].password;
  if (bcrypt.compareSync(password, hashedPassword)) {
    const user = {
      id: data.user[0].id,
      username: data.user[0].username,
      email: data.user[0].email,
    };
    const refreshtoken = generateRefreshToken({
      username: user.username,
      email: user.email,
    });

    res.cookie("jwt", refreshtoken, {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: "none",
      secure: true,
    });

    const { data: dataUpdated, errors: errorsUpdated } = await executeQuery(
      { id: user.id, refreshtoken },
      SET_USER_REFRESH_TOKEN
    );

    if (errorsUpdated)
      return res.json({
        success: false,
        error: "Something Went Wrong Please Try Again!",
      });

    const accessToken = generateAccessToken({ user });

    return res.json({
      success: true,
      accessToken,
      user,
    });
  } else
    return res.json({ success: false, error: "Email/Password miss-match" });
});
app.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 10);
  const refreshtoken = generateRefreshToken({ username, email });
  // Creating a user
  const { data, errors } = await executeQuery(
    {
      username,
      email,
      password: hashedPassword,
      refreshtoken,
    },
    CREATE_USER
  );

  if (errors) {
    if (errors[0].message.includes("users_username_key"))
      return res.json({ success: false, error: "User Name Already Taken" });
    else if (errors[0].message.includes("users_email_key"))
      return res.json({ success: false, error: "Email is already taken" });
    else return res.json({ success: false, error: errors });
  }
  // store The refreshToken
  res.cookie("jwt", refreshtoken, {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: "none",
    secure: true,
  });

  // { id: 23, username: 'gecho1', email: 'gecho1@gmail.com' }
  const accessToken = generateAccessToken({ user: data.user });

  res.json({ success: true, user: data.user, accessToken });
});
app.get("/refresh", async (req, res) => {
  let accessToken = generateAccessToken({ user: null });

  const cookie = req.cookies;
  if (!cookie?.jwt) {
    return res.json({
      success: false,
      error: "You are not authorized",
      accessToken,
      user: null,
    });
  }

  const refreshtoken = cookie.jwt;

  const { data, errors } = await executeQuery(
    {
      refreshtoken,
    },
    GET_USER_BY_REFRESH_TOKEN
  );

  if (errors)
    return res.json({
      success: false,
      error: "You Are Not Authorized",
      accessToken,
    });

  jwt.verify(refreshtoken, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      res.clearCookie("jwt", {
        httpOnly: true,
        sameSite: "none",
        secure: true,
      });
      return res.json({
        success: false,
        error: "Invalid/Expired Token",
        accessToken,
        user: null,
      });
    }

    const user = data.user[0];

    accessToken = generateAccessToken({ user });
    return res.json({
      success: true,
      user,
      accessToken,
    });
  });
});

app.get("/logout", async (req, res) => {
  const accessToken = generateAccessToken({ user: null });
  const cookie = req.cookies;
  if (!cookie?.jwt) return res.json({ success: true, accessToken });

  // Clear Cookie
  res.clearCookie("jwt", {
    httpOnly: true,
    sameSite: "none",
    secure: true,
  });

  const { data, errors } = await executeQuery(
    {
      refreshtoken: cookie.jwt,
    },
    GET_USER_BY_REFRESH_TOKEN
  );

  if (errors) return res.json({ success: false, error: errors, accessToken });

  const id = data.user[0].id;
  await executeQuery({ id }, REMOVE_USER_REFRESH_TOKEN);
  res.json({ success: true, accessToken });
});

const port = process.env.PORT || 5000;
app.listen(port, function () {
  console.log(
    "Express server listening on port %d in %s mode",
    this.address().port,
    app.settings.env
  );
});

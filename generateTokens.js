const jwt = require("jsonwebtoken");
const generateAccessToken = (data) => {
  let accessToken = "";
  if (data.user) {
    accessToken = jwt.sign(
      {
        name: data.user.username,
        "https://hasura.io/jwt/claims": {
          "x-hasura-allowed-roles": ["editor", "user", "admin"],
          "x-hasura-default-role": "admin",
          "x-hasura-user-id": data.user.id,
        },
      },
      process.env.ACCESS_TOKEN_SECRET,
      {
        expiresIn: "15m",
      }
    );
    return accessToken;
  }

  // IF user Is Not SIgned in
  accessToken = jwt.sign(
    {
      name: "annonymous",
      "https://hasura.io/jwt/claims": {
        "x-hasura-allowed-roles": ["editor", "user"],
        "x-hasura-default-role": "user",
      },
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: "15m",
    }
  );

  return accessToken;
};
const generateRefreshToken = (data) => {
  const refreshToken = jwt.sign(data, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: "7d",
  });

  return refreshToken;
};

module.exports = { generateAccessToken, generateRefreshToken };
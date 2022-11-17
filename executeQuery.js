require("dotenv").config();
const axios = require("axios");
const endpoint = process.env.END_POINT;
const header = {
  "content-type": "application/json",
  "x-hasura-admin-secret": process.env.ADMIN_SECRET,
};

const executeQuery = async (variables, operation) => {
  const graphqlQuery = {
    query: operation,
    variables: variables,
  };

  let connError = false;

  do {
    try {
      const hasuraResponse = await axios({
        url: endpoint,
        headers: header,
        method: "post",
        data: graphqlQuery,
      });

      return hasuraResponse.data;
    } catch (error) {
      connError = true;
    }
  } while (connError);
};

module.exports = executeQuery;
const CREATE_USER = `mutation($username:String!, $email:String!, $password:String!, $refreshtoken:String! ){
  user:insert_users_one(object:{email:$email, password:$password, username:$username, refreshtoken:$refreshtoken}){
    id
    username
    email
  }
}`;

const GET_USER_BY_EMAIL = `query($email:String!){
  user:users(where:{email:{_eq:$email}}){
    id
    username
    email
    password
  }
}`;

const GET_USER_BY_REFRESH_TOKEN = `query($refreshtoken:String!){
  user:users(where:{refreshtoken:{_eq:$refreshtoken}}){
    id
    username
    email
  }
}`;

const SET_USER_REFRESH_TOKEN = `mutation($id:uuid!, $refreshtoken:String!){
  user:update_users_by_pk(pk_columns:{id:$id}, _set:{refreshtoken:$refreshtoken}){
    id
  }
}`;

const REMOVE_USER_REFRESH_TOKEN = `mutation($id:uuid!){
  user:update_users_by_pk(pk_columns:{id:$id}, _set:{refreshtoken:null}){
    id
  }
}`;

module.exports = {
  CREATE_USER,
  GET_USER_BY_EMAIL,
  GET_USER_BY_REFRESH_TOKEN,
  SET_USER_REFRESH_TOKEN,
  REMOVE_USER_REFRESH_TOKEN,
};

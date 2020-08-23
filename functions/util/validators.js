//Helper methods

const isEmail = (email) => {
  const regEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  if (email.match(regEx)) return true;
  else return false;
};
const isEmpty = (string) => {
  if (string.trim() === "") return true;
  else return false;
};

exports.validateSignupData = (data) => {
  let errors = {};

  //Data validation before submitting

  //Email
  if (isEmpty(data.userEmail)) {
    errors.email = "Váš e-mail nebyl vyplněn";
  } else if (!isEmail(data.userEmail)) {
    errors.email = "Váš e-mail je ve špatném formátu";
  }

  //Password
  if (isEmpty(data.userPassword)) {
    errors.password = "Vaše heslo nebylo vyplněno";
  }
  if (data.userPassword !== data.userConfirmPassword) {
    errors.password = "Hesla se neshodují";
  }

  return {
    errors,
    valid: Object.keys(errors).length === 0 ? true : false,
  };
};

exports.validateLoginData = (data) => {
  let errors = {};

  if (isEmpty(data.userEmail)) errors.email = "E-mail nebyl vyplněn";
  if (isEmpty(data.userPassword)) errors.password = "Heslo nebylo vyplněno";

  return {
    errors,
    valid: Object.keys(errors).length === 0 ? true : false,
  };
};


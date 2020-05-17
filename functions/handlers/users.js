const { db } = require("../util/admin");

const config = require("../util/config");
const firebase = require("firebase");
firebase.initializeApp(config);

const { validateSignupData, validateLoginData } = require("../util/validators");

exports.signup = (req, res) => {
  const newUser = {
    userEmail: req.body.userEmail,
    userPassword: req.body.userPassword,
    userConfirmPassword: req.body.userConfirmPassword,
    userFirstName: req.body.userFirstName,
    userLastName: req.body.userLastName,
  };

  const { valid, errors } = validateSignupData(newUser);

  if (!valid) return res.status(400).json(errors);

  //Data validation before submitting

  let accessToken;

  firebase
    .auth()
    .createUserWithEmailAndPassword(newUser.userEmail, newUser.userPassword)
    .then((data) => {
      console.log("User successfully created");
      userUID = data.user.uid;
      return data.user.getIdToken();
    })
    .then((token) => {
      accessToken = token;

      //Vytváření doc v /users/ pro new usera
      const userCredentials = {
        userFirstName: newUser.userFirstName,
        userLastName: newUser.userLastName,
        userUID: userUID,
      };
      return db.doc(`/users/${userCredentials.userUID}`).set(userCredentials);
    })
    .then(() => {
      return res.status(201).json({ accessToken });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

exports.login = (req, res) => {
  const user = {
    userEmail: req.body.userEmail,
    userPassword: req.body.userPassword,
  };

  const { valid, errors } = validateLoginData(user);

  if (!valid) return res.status(400).json(errors);

  firebase
    .auth()
    .signInWithEmailAndPassword(user.userEmail, user.userPassword)
    .then((data) => {
      return data.user.getIdToken();
    })
    .then((token) => {
      return res.json({ token });
    })
    .catch((err) => {
      console.log(err);
      if (err.code === "auth/wrong-password") {
        return res.status(403).json({
          general:
            "Přihlašovací údaje nesouhlasí. Překontrolujte je prosím a zkuste to znovu",
        });
      } else return res.status(500).json({ error: err.code });
    });
};

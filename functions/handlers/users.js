const { db, admin } = require("../util/admin");

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

  const noImg = "no-img.png";

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
        imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media`,
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

exports.uploadImage = (req, res) => {
  const BusBoy = require("busboy");
  const path = require("path");
  const os = require("os");
  const fs = require("fs");

  const busboy = new BusBoy({ headers: req.headers });

  let imageFileName;
  let imageToBeUploaded = {};

  busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
    if (mimetype !== "image/jpeg" && mimetype !== "image/png") {
      return res.status(400).json({ error: "Tento formát není podporován" });
    }
    const imageExtension = filename.split(".")[filename.split(".".length - 1)];
    const imageFileName = `${Math.round(
      Math.random() * 10000000
    )}.${imageExtension}`;
    const filepath = path.join(os.tmpdir(), imageFileName);
    imageToBeUploaded = {
      filepath,
      mimetype,
    };
    file.pipe(fs.createWriteStream(filepath));
  });
  busboy.on("finish", () => {
    admin
      .storage()
      .bucket()
      .upload(imageToBeUploaded.filepath, {
        resumeable: false,
        metadata: {
          metadata: {
            contentType: imageToBeUploaded.mimetype,
          },
        },
      })
      .then(() => {
        const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`;
        return db.doc(`/users/${req.user.uid}`).update({ imageUrl });
      })
      .then(() => {
        return res.json({ message: "Image uploaded successfully" });
      })
      .catch((err) => {
        return res.status(500).json({ error: err.code });
      });
  });
  busboy.end(req.rawBody);
};

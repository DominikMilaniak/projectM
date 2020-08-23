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
      if (err.code === "auth/email-already-in-use") {
        return res
          .status(400)
          .json({ email: "Tento e-mail už je připojen k existujícímu účtu." });
      } else {
        return res
          .status(500)
          .json({ general: "Něco se pokazilo, zkuste to prosím znovu." });
      }
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
      return res.status(403).json({
        general:
          "Přihlašovací údaje nesouhlasí. Překontrolujte je prosím a zkuste to znovu",
      });
    });
};

//GET ANY USER DETAILS
exports.getUserDetails = (req, res) => {
  let userData = {};
  db.doc(`/users/${req.params.userID}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        userData.user = doc.data();
        return db
          .collection("listings")
          .where("listingAuthor", "==", req.params.userID)
          .orderBy("listingCreatedAt", "desc")
          .get();
      } else {
        return res.status(404).json({ error: "User not found" });
      }
    })
    .then((data) => {
      userData.listings = [];
      data.forEach((doc) => {
        userData.listings.push({
          listingID: doc.id,
          ...doc.data(),
        });
      });
      return res.json(userData);
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

//MARK NOTIFICATIONS AS READ
exports.markNotificationsRead = (req, res) => {
  let batch = db.batch();
  req.body.forEach((notificationID) => {
    const notification = db.doc(`/notifications/${notificationID}`);
    batch.update(notification, { notificationRead: true });
  });
  batch
    .commit()
    .then(() => {
      return res.json({ message: "Notifications marked as read" });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

//GET AUTHED USER DETAILS
exports.getAuthenticatedUser = (req, res) => {
  let userData = {};
  db.doc(`/users/${req.user.uid}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        userData.credentials = doc.data();
        return db
          .collection("favorites")
          .where("userID", "==", req.user.uid)
          .get();
      }
    })
    .then((data) => {
      userData.favorites = [];
      data.forEach((doc) => {
        userData.favorites.push(doc.data());
      });
      return db
        .collection("notifications")
        .where("notificationRecipient", "==", req.user.uid)
        .orderBy("notificationCreatedAt", "desc")
        .limit(10)
        .get();
    })
    .then((data) => {
      userData.notifications = [];
      data.forEach((doc) => {
        userData.notifications.push({
          notificationRecipient: doc.data().notificationRecipient,
          notificationCreatedAt: doc.data().notificationCreatedAt,
          notificationRead: doc.data().notificationRead,
          notificationCallback: doc.data().notificationCallback,
          notificationSender: doc.data().notificationSender,
          notificationType: doc.data().notificationType,
          notificationID: doc.id,
        });
      });
      return res.json(userData);
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

//PROFILE IMAGE
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
    const imageExtension = filename.substring(
      filename.lastIndexOf(".") + 1,
      filename.length
    );
    imageFileName = `${Math.round(Math.random() * 10000000)}.${imageExtension}`;
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
      .bucket("projectm-fd95f.appspot.com")
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
        return res.json({ message: `Image uploaded: ${imageFileName}` });
      })
      .catch((err) => {
        return res.status(500).json({ error: err.code });
      });
  });
  busboy.end(req.rawBody);
};

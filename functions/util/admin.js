var admin = require("firebase-admin");

var fbConfig = require("./firebaseConfig");

admin.initializeApp(fbConfig);

const db = admin.firestore();

module.exports = { admin, db };

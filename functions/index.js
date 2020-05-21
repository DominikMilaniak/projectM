const functions = require("firebase-functions");

const app = require("express")();

const FBAuth = require("./util/FBAuth");

const { fetchListings, createListing } = require("./handlers/listings");
const { signup, login, uploadImage } = require("./handlers/users");

// LISTINGS ROUTES
app.get("/fetchListings", fetchListings);
app.post("/createListing", FBAuth, createListing);

// AUTH ROUTES
app.post("/signup", signup);
app.post("/login", login);

app.post("/user/image", FBAuth, uploadImage);

exports.api = functions.region("europe-west1").https.onRequest(app);

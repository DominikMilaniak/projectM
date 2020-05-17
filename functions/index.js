const functions = require("firebase-functions");

const app = require("express")();

const FBAuth = require("./util/FBAuth");

const { fetchListings, createListing } = require("./handlers/listings");
const { signup, login } = require("./handlers/users");

// LISTINGS ROUTES
app.get("/fetchListings", fetchListings);
app.post("/createListing", FBAuth, createListing);

// AUTH ROUTES
app.post("/signup", signup);
app.post("/login", login);

exports.api = functions.region("europe-west1").https.onRequest(app);

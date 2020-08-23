const functions = require("firebase-functions");

const app = require("express")();

const FBAuth = require("./util/FBAuth");

const { db } = require("./util/admin");

const {
  fetchListings,
  createListing,
  deleteListing,
  getListing,
  favoriteListing,
  unfavoriteListing,
} = require("./handlers/listings");
const {
  signup,
  login,
  uploadImage,
  getAuthenticatedUser,
  getUserDetails,
  markNotificationsRead,
} = require("./handlers/users");

const { fetchChat, addMessage } = require("./handlers/chats");

// LISTINGS ROUTES
app.get("/fetchListings", fetchListings);
app.post("/createListing", FBAuth, createListing);
app.delete("/listing/:listingID", FBAuth, deleteListing);
app.get("/listing/:listingID", getListing);
app.get("/listing/:listingID/favorite", FBAuth, favoriteListing);
app.get("/listing/:listingID/unfavorite", FBAuth, unfavoriteListing);

// AUTH ROUTES
app.post("/signup", signup);
app.post("/login", login);

//USERS ROUTES
app.get("/user", FBAuth, getAuthenticatedUser);
app.post("/user/image", FBAuth, uploadImage);
app.get("/user/:userID", getUserDetails);
app.post("/notifications", FBAuth, markNotificationsRead);

//CHATS ROUTES
app.post("/chats/:chatID/message", FBAuth, addMessage);
app.get("/chats/:chatID", FBAuth, fetchChat);

exports.api = functions.region("europe-west1").https.onRequest(app);

exports.createNotificationOnMessage = functions
  .region("europe-west1")
  .firestore.document("messages/{id}")
  .onCreate((snapshot) => {
    return db
      .doc(`/chats/${snapshot.data().chatID}`)
      .get()
      .then((doc) => {
        if (doc.exists) {
          let recipient;
          let sender;
          if (doc.data().userSellerID == snapshot.data().userID) {
            recipient = doc.data().userSellerID;
            sender = doc.data().userTakerID;
          } else {
            recipient = doc.data().userTakerID;
            sender = doc.data().userSellerID;
          }
          return db.doc(`/notifications/${snapshot.id}`).set({
            notificationCreatedAt: new Date().toISOString(),
            notificationRecipient: recipient,
            notificationSender: sender,
            notificationType: "message",
            notificationCallback: doc.id,
            notificationRead: false,
          });
        }
      })
      .catch((err) => {
        console.error(err);
      });
  });

exports.createNotificationOnFavorite = functions
  .region("europe-west1")
  .firestore.document("favorites/{id}")
  .onCreate((snapshot) => {
    return db
      .doc(`/listings/${snapshot.data().listingID}`)
      .get()
      .then((doc) => {
        return db.doc(`/notifications/${snapshot.id}`).set({
          notificationCreatedAt: new Date().toISOString(),
          notificationRecipient: doc.data().listingAuthor,
          notificationSender: snapshot.data().userID,
          notificationType: "favorite",
          notificationCallback: doc.id,
          notificationRead: false,
        });
      })
      .catch((err) => {
        console.error(err);
      });
  });

exports.onListingDelete = functions
  .region("europe-west1")
  .firestore.document("/listings/{listingID}")
  .onDelete((snapshot, context) => {
    const listingID = context.params.listingID;
    const batch = db.batch();
    return db
      .collection("favorites")
      .where("listingID", "==", listingID)
      .get()
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`/favorites/${doc.id}`));
        });
        return db
          .collection("notifications")
          .where("notificationCallback", "==", listingID)
          .get();
      })
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`/notifications/${doc.id}`));
        });
        return batch.commit();
      })
      .catch((err) => {
        console.error(err);
      });
  });

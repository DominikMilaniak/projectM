const { db } = require("../util/admin");

exports.getListing = (req, res) => {
  let listingData = {};

  db.doc(`/listings/${req.params.listingID}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: "Listing not found" });
      }
      listingData = doc.data();
      listingData.listingID = doc.id;
      return res.json(listingData);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

exports.fetchListings = (req, res) => {
  db.collection("listings")
    .orderBy("listingStatus", "desc")
    .get()
    .then((data) => {
      let listings = [];
      data.forEach((doc) => {
        listings.push({
          listingID: doc.id,
          ...doc.data(),
        });
      });
      return res.json(listings);
    })
    .catch((err) => console.error(err));
};

exports.createListing = (req, res) => {
  const newListing = {
    listingAuthor: req.user.uid,
    listingDeadline: req.body.listingDeadline,
    listingDescription: req.body.listingDescription,
    listingLocation: req.body.listingLocation,
    listingName: req.body.listingName,
    listingPrice: req.body.listingPrice,
    listingStatus: req.body.listingStatus,
    listingType: req.body.listingType,
    listingCreatedAt: new Date().toISOString(),
  };

  db.collection("listings")
    .add(newListing)
    .then((doc) => {
      const resListing = newListing;
      resListing.listingID = doc.id;
      res.json(resListing);
    })
    .catch((err) => {
      res.status(500).json({ error: `error creating document ${err}` });
      console.error(err);
    });
};

exports.deleteListing = (req, res) => {
  const document = db.doc(`/listings/${req.params.listingID}`);
  document
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: "Listing not found" });
      }

      if (doc.data().listingAuthor !== req.user.uid) {
        return res.status(403).json({ error: "Unauthorized" });
      } else {
        return document.delete();
      }
    })
    .then(() => {
      res.json({ message: "Deleted successfully" });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

exports.favoriteListing = (req, res) => {
  const favoriteDocument = db
    .collection("favorites")
    .where("userID", "==", req.user.uid)
    .where("listingID", "==", req.params.listingID)
    .limit(1);

  const listingDocument = db.doc(`/listings/${req.params.listingID}`);

  let listingData;

  listingDocument
    .get()
    .then((doc) => {
      if (doc.exists) {
        listingData = doc.data();
        listingData.listingID = doc.id;
        return favoriteDocument.get();
      } else {
        return res.status(404).json({ error: "Listing not found" });
      }
    })
    .then((data) => {
      if (data.empty) {
        return db
          .collection("favorites")
          .add({
            listingID: req.params.listingID,
            userID: req.user.uid,
          })
          .then(() => {
            return res.json(listingData);
          });
      } else {
        return res.status(400).json({ error: "Listing already favorited" });
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

exports.unfavoriteListing = (req, res) => {
  const favoriteDocument = db
    .collection("favorites")
    .where("userID", "==", req.user.uid)
    .where("listingID", "==", req.params.listingID);

  const listingDocument = db.doc(`/listings/${req.params.listingID}`);

  let listingData;

  listingDocument
    .get()
    .then((doc) => {
      if (doc.exists) {
        listingData = doc.data();
        listingData.listingID = doc.id;
        return favoriteDocument.get();
      } else {
        return res.status(404).json({ error: "Listing not found" });
      }
    })
    .then((data) => {
      if (data.empty) {
        return res.status(400).json({ error: "Listing not favorited yet" });
      } else {
        return db
          .doc(`/favorites/${data.docs[0].id}`)
          .delete()
          .then(() => {
            res.json(listingData);
          });
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

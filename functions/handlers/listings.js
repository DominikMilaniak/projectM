const { db } = require("../util/admin");

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
      res.json({ message: `document ${doc.id} has been created` });
    })
    .catch((err) => {
      res.status(500).json({ error: `error creating document ${err}` });
      console.error(err);
    });
};

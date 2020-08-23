const { db } = require("../util/admin");

exports.fetchChat = (req, res) => {
  let chatData = {};
  db.doc(`/chats/${req.params.chatID}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: `Chat doesn't exist` });
      }
      chatData = doc.data();
      chatData.chatID = doc.id;
      return db
        .collection("messages")
        .orderBy("messageCreatedAt", "desc")
        .where("chatID", "==", req.params.chatID)
        .get();
    })
    .then((data) => {
      chatData.messages = [];
      data.forEach((doc) => {
        chatData.messages.push(doc.data());
      });
      return res.json(chatData);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

//SEND MESSAGE
exports.addMessage = (req, res) => {
  if (req.body.messageText.trim() === "")
    return res.status(400).json({ error: "Message must not be empty" });

  const newMessage = {
    messageText: req.body.messageText,
    messageCreatedAt: new Date().toISOString(),
    chatID: req.params.chatID,
    messageAuthor: req.user.uid,
    //Possible profile pic load to lower db reads
    //messageAuthorProfileImage: req.user.imageUrl
  };

  db.doc(`/chats/${req.params.chatID}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: "Chat doesn't exist" });
      }
      return db
        .collection("messages")
        .add(newMessage)
        .then(() => {
          res.json(newMessage);
        })
        .catch((err) => {
          console.error(err);
          res.status(500).json({ error: "Something went wrong" });
        });
    });
};

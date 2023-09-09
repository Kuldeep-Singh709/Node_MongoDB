const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  // Define your schema fields here
  username: String,
  message: String,
  room: String,
});

module.exports = mongoose.model("Message", messageSchema);

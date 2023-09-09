const path = require("path");
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const formatMessage = require("./utils/messages");
const mongoose = require("mongoose"); // Added Mongoose
const Message = require("./Models/Message"); // Define a Message model
require("dotenv").config();
const { userJoin, getCurrentUser, userLeave, getRoomUsers } = require("./utils/users");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// MongoDB setup
mongoose.connect("mongodb://127.0.0.1:27017",{ dbname:'Chat_Application'}, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error: " + err));


  
app.use(express.static(path.join(__dirname, "public")));

const botName = "ChatCord Bot";

// Run when client connects
io.on("connection", (socket) => {
  socket.on("joinRoom", async ({ username, room }) => {
    const user = userJoin(socket.id, username, room);

    socket.join(user.room);

    // Welcome current user
    socket.emit("message", formatMessage(botName, "Welcome to ChatCord!"));

    // Broadcast when a user connects
    socket.broadcast
      .to(user.room)
      .emit(
        "message",
        formatMessage(botName, `${user.username} has joined the chat`)
      );

    // Send users and room info
    io.to(user.room).emit("roomUsers", {
      room: user.room,
      users: getRoomUsers(user.room),
    });

    try {
      // Load previous messages from MongoDB
      const messages = await Message.find({ room: user.room }).limit(10).sort("-createdAt");
      socket.emit("load messages", messages);
    } catch (err) {
      console.error("Error loading messages from MongoDB: " + err);
    }
  });

  // Listen for chatMessage
  socket.on("chatMessage", async (msg) => {
    const user = getCurrentUser(socket.id);

    // Save the message to MongoDB
    const message = new Message({
      username: user.username,
      message: msg,
      room: user.room,
    });

    try {
      await message.save();
    } catch (err) {
      console.error("Error saving message to MongoDB: " + err);
    }

    io.to(user.room).emit("message", formatMessage(user.username, msg));
  });

  // Runs when client disconnects
  socket.on("disconnect", () => {
    const user = userLeave(socket.id);

    if (user) {
      io.to(user.room).emit(
        "message",
        formatMessage(botName, `${user.username} has left the chat`)
      );

      // Send users and room info
      io.to(user.room).emit("roomUsers", {
        room: user.room,
        users: getRoomUsers(user.room),
      });
    }
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));




























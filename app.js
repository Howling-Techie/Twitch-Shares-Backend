const express = require("express");

const app = express();
const apiRouter = require("./routes/api.router");
const path = require("path");
const cors = require("cors");
const {createServer} = require("http");
const {Server} = require("socket.io");
app.use(express.json());
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "http://localhost:8081",
        methods: ["GET", "POST"]
    }
});

io.on("connection", (socket) => {
    console.log("New Inbound Connection");
    socket.on("register user", (user_id) => {
        console.log(`User ${user_id} connected`);
        socket.leave(user_id);
        socket.leave("updates");
        socket.leave("resets");
        socket.join(user_id);
        socket.join("updates");
        socket.join("resets");
    });
});

async function updateUsers(nextUpdate) {
    const topGames = await getGames();
    io.to("updates").emit("update", {times: {updateTime: Date.now(), nextUpdate}, games: topGames});
}

httpServer.listen(3000);
const {updateGameValues, getGames} = require("./supabase");

app.use("/api", apiRouter);
app.use((err, req, res, next) => {
    if (err.status && err.msg) {
        res.status(err.status).send({msg: err.msg});
    } else {
        console.log(err);
        res.status(500).send({msg: "Internal Server Error"});
    }
});

async function updateAtIntervals() {
    const now = new Date();
    const minutes = now.getMinutes();

    if (minutes % 15 === 0) {
        await updateGameValues();
        const nextUpdate = new Date();
        nextUpdate.setMinutes(nextUpdate.getMinutes() + 15);
        await updateUsers(nextUpdate);
    }
}

// Set interval to check for updates
setInterval(updateAtIntervals, 60 * 1000); // Check every minute
module.exports = app;

const express = require("express");

const app = express();
const apiRouter = require("./routes/api.router");
const path = require("path");
const cors = require("cors");
const {createServer} = require("http");
const {Server} = require("socket.io");
app.use(express.json());
app.use(cors());
const {updateGameValues, getGames} = require("./supabase");

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "http://localhost:8081",
        methods: ["GET", "POST"]
    }
});
const users = [];
io.on("connection", (socket) => {

    socket.join("updates");
    socket.join("resets");
    socket.on("register user", (user_id) => {
        socket.join(user_id);
        users.push({user_id, socket_id: socket.id});
    });
    socket.on("disconnecting", (reason) => {
        socket.leave("updates");
        socket.leave("resets");
        const index = users.findIndex(obj => obj.socket_id === socket.id);

        if (index !== -1) {
            users.splice(index, 1);
        }
    });
});

//httpServer.listen(10000);

async function updateUsers(nextUpdate) {
    const topGames = await getGames();
    io.to("updates").emit("update", {times: {updateTime: Date.now(), nextUpdate}, games: topGames});
}

function updateUser(user_id, game) {
    io.to(user_id).emit("game_update", {game});
}

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
    const seconds = now.getSeconds();
    if (minutes % 15 === 0) {
        await updateGameValues(users.map(user => user.user_id), updateUser);
        const nextUpdate = new Date();
        nextUpdate.setMinutes(nextUpdate.getMinutes() + 15);
        await updateUsers(nextUpdate);
    }
}

function startUpdateInterval() {
// Set interval to check for updates
    setInterval(updateAtIntervals, 60 * 1000); // Check every minute
}

startUpdateInterval();

module.exports = httpServer;

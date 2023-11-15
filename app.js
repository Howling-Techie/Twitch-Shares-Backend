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
        origin: "http://localhost:10000",
        methods: ["GET", "POST"]
    }
});
const users = [];
io.on("connection", (socket) => {
    console.log("New Inbound Connection");
    socket.join("updates");
    socket.join("resets");
    socket.on("register user", (user_id) => {
        console.log(`Registering user ${user_id}`);
        socket.join(user_id);
        users.push(user_id);
        const now = new Date();
        const currentMinute = now.getMinutes();

        // Calculate the start of the current 15-minute interval
        const startInterval = new Date(now);
        startInterval.setMinutes(currentMinute - (currentMinute % 15), 0, 0);

        // Calculate the end of the current 15-minute interval
        const endInterval = new Date(startInterval);
        endInterval.setMinutes(startInterval.getMinutes() + 15);
        getGames().then((topGames) => {
            socket.emit("update", {times: {updateTime: startInterval, nextUpdate: endInterval}, games: topGames});
        });
    });
});

httpServer.listen(10000);

async function updateUsers(nextUpdate) {
    const topGames = await getGames();
    console.log("Updating Users");
    io.to("updates").emit("update", {times: {updateTime: Date.now(), nextUpdate}, games: topGames});
}

function updateUser(user_id, game) {
    io.to(user_id).emit("game_update", {game});
    console.log("Sending game update to " + user_id);
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
    if (minutes % 15 === 0 && seconds < 10) {
        await updateGameValues(users, updateUser);
        const nextUpdate = new Date();
        nextUpdate.setMinutes(nextUpdate.getMinutes() + 15);
        await updateUsers(nextUpdate);
    }
}

function startUpdateInterval() {
// Set interval to check for updates
    setInterval(updateAtIntervals, 60 * 1000); // Check every minute
}

function startUpdateGameInfoAtInterval() {
// Set interval to check for updates
    setInterval(updateAtIntervals, 10 * 1000); // Check every ten seconds
}

module.exports = app;

const express = require("express");

const app = express();
const apiRouter = require("./routes/api.router");
const path = require("path");
const cors = require("cors");
const {createServer} = require("http");
const {Server} = require("socket.io");

const httpServer = createServer(app);
const io = new Server(httpServer, { /* options */});

io.on("connection", (socket) => {

});

httpServer.listen(3000);
const {updateGameValues} = require("./supabase");

app.use(express.json());
app.use(cors());

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
    }
}

// Set interval to check for updates
setInterval(updateAtIntervals, 60 * 1000); // Check every minute

module.exports = app;

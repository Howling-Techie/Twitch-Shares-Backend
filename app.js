const express = require("express");

const app = express();
const apiRouter = require("./routes/api.router");
const path = require("path");
const cors = require("cors");
const {updateGameValues} = require("./supabase");
const {createServer} = require("http");

const httpServer = createServer(app);
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

    if (minutes % 1 === 0) {
        await updateGameValues();
    }
}

let updateIntervalID = undefined;

function startUpdateInterval() {
// Set interval to check for updates
    updateIntervalID = setInterval(updateAtIntervals, 60 * 1000); // Check every minute
}

startUpdateInterval();

module.exports = app;

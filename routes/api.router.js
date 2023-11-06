const {readFile} = require("fs/promises");

const apiRouter = require("express").Router();

apiRouter.get("/", async (req, res) => {
    const endpointsFile = await readFile("./api.json", {encoding: "utf-8"});
    const endpoints = JSON.parse(endpointsFile);
    res.status(200).send({endpoints});
});

module.exports = apiRouter;

require("dotenv").config();
//const app = require("./app");
const httpServer = require("./app");

const {PORT = 9090} = process.env;
const hostname = "0.0.0.0";
httpServer.listen(PORT, hostname, function () {
    console.log("listening at https://%s:%s", hostname, PORT);
}).on("error", (e) => {
    console.error(e.message);
    throw e;
});

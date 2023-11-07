require("dotenv").config();
const app = require("./app");
const {PORT = 9090} = process.env;

app.listen(PORT, "localhost", function () {
    console.log("listening at http://%s:%s", "localhost", PORT);
}).on("error", (e) => {
    console.error(e.message);
    throw e;
});

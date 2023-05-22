require("dotenv").config();
const express = require("express");
const cors = require("cors");
const runwayAPI = require("./api/runway");

const app = express();
const port = process.env.SERVER_PORT;


  app.use(cors());


app.get("/api/v1/runway/:icao", runwayAPI);

app.listen(port, () => {
  console.log("Runway app is listening on http://localhost:" + port);
});

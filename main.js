require("dotenv").config();
const express = require("express");
const cors = require("cors");
const runwayAPI = require("./api/runway");

const app = express();
const port = process.env.SERVER_PORT;


  app.use(cors());

  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
  });
  app.get('/',(req,res)=>{
    rs.send('server is run')
  })
app.get("/api/v1/runway/:icao", runwayAPI);

app.listen(port, () => {
  console.log("Runway app is listening on http://localhost:" + port);
});

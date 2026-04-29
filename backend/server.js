const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

app.get("/", (req, res) => {
  res.send("VOXYN backend is running");
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "VOXYN API is working",
  });
});

app.listen(PORT, () => {
  console.log(`VOXYN backend running on http://localhost:${PORT}`);
});
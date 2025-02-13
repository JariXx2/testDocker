const express = require("express");
const app = express();
const port = 3000;
const {Client} = require("pg");

const client = new Client({
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || "postgres",
});

app.get("/", (req, res) => {
    client
    .connect()
    .then(() => console.log("Connected to PostgreSQL"))
    .catch((err) => console.error("Connection error", err.stack));
    res.send("Hello World!");
});

app.listen(port, () => {
    console.log(`App listen at http://localhost:${port}`);
});

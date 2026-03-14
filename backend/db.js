const { Client } = require('pg');

const client = new Client({
    host: "localhost",
    user: "postgres",
    password: "5321",
    database: "coreinventory",
    port: 5432
});

client.connect()
.then(() => console.log("✅ PostgreSQL Connected"))
.catch(err => console.error("Connection error", err));

module.exports = client;
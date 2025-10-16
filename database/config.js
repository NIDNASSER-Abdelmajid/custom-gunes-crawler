require("dotenv").config();

const dbConfig = {
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "crawler_data",
  password: process.env.DB_PASSWORD || "",
  port: process.env.DB_PORT || 5432,
  max: 20, // maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

module.exports = dbConfig;

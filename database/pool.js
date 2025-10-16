const { Pool } = require("pg");
const dbConfig = require("./config");

const pool = new Pool(dbConfig);

// Test connection function
async function testConnection() {
  try {
    const client = await pool.connect();
    console.log("✅ Database connected successfully");
    client.release();
    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    return false;
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Closing database connections...");
  await pool.end();
  console.log("Database connections closed");
  process.exit(0);
});

module.exports = {
  pool,
  testConnection,
};

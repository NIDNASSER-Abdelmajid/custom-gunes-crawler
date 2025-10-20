const fs = require("fs");
const path = require("path");
const pool = require("./dbConfig");

async function initDB() {
  try {
    console.log("Initializing database...");

    // Read the schema file
    const schemaPath = path.join(__dirname, "schema.sql");
    const schema = fs.readFileSync(schemaPath, "utf8");

    // Execute the schema
    await pool.query(schema);

    console.log("Database initialized successfully.");
  } catch (error) {
    console.error("Error initializing database:", error);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  initDB();
}

module.exports = initDB;

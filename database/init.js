const { pool } = require("./pool");
const fs = require("fs");
const path = require("path");

async function initializeDatabase() {
  try {
    console.log("Initializing database...");

    // Read schema file
    const schemaPath = path.join(__dirname, "schema.sql");
    const schema = fs.readFileSync(schemaPath, "utf8");

    // Split by semicolon to execute each statement separately
    const statements = schema.split(";").filter((stmt) => stmt.trim());

    for (const statement of statements) {
      if (statement.trim()) {
        await pool.query(statement);
      }
    }

    console.log("✅ Database initialized successfully!");
  } catch (error) {
    console.error("❌ Error initializing database:", error);
    throw error;
  }
}

// Run initialization if this script is executed directly
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log("Database setup completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Database setup failed:", error);
      process.exit(1);
    });
}

module.exports = initializeDatabase;

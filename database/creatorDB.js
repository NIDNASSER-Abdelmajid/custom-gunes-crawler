const pool = require("./dbConfig");

class CreatorDB {
  constructor() {
    this.pool = pool;
  }

  async init() {
    try {
      await this.pool.query("SELECT 1");
      console.log("Database connection established.");
    } catch (error) {
      console.error("Database connection failed:", error);
    }
  }

  async insertSession(data) {
    const result = await this.pool.query(
      "INSERT INTO crawl_sessions (initial_url, final_url, timeout, test_started, test_finished) VALUES ($1, $2, $3, to_timestamp($4/1000), to_timestamp($5/1000)) RETURNING session_id",
      [
        data.initialUrl,
        data.finalUrl,
        data.timeout,
        data.testStarted,
        data.testFinished,
      ]
    );
    return result.rows[0].session_id;
  }

  async close() {
    await this.pool.end();
  }
}

module.exports = CreatorDB;

# Database Setup and Usage

This folder contains scripts to set up and populate a PostgreSQL database with crawler data.

## Files

- `schema.sql`: The SQL schema defining all tables for storing crawler output.
- `dbConfig.js`: Database connection configuration using environment variables.
- `initDB.js`: Script to initialize the database by creating tables from schema.sql.
- `importFromJSON.js`: Script to import data from a crawler JSON output file into the database.
- `creatorDB.js`: A class for interacting with the database (e.g., inserting sessions).

## Setup

1. Ensure PostgreSQL is running and create a database (e.g., `crawler_db`).
2. Set environment variables for DB connection:

   - `DB_HOST` (default: localhost)
   - `DB_PORT` (default: 5432)
   - `DB_NAME` (default: crawler_db)
   - `DB_USER` (default: postgres)
   - `DB_PASSWORD` (default: empty)

3. Run the init script:
   ```
   node database/initDB.js
   ```

## Importing Data

After a crawl, import the JSON output:

```
node database/importFromJSON.js path/to/crawl_output.json
```

This will parse the JSON and insert all collected data into the appropriate tables, linked by session_id.

## Schema Overview

The schema includes tables for:

- Crawl sessions
- Fingerprints and calls
- Requests, headers, initiators
- Cookies
- Ads (with links, images, scripts, iframes)
- CMPs and scripts
- Screenshots
- API calls
- Targets
- Links
- Videos
- Elements

All data is normalized with foreign keys to the crawl_sessions table.

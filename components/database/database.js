import * as SQLite from "expo-sqlite";

// Database instance with initialization flag
let db = null;
let isInitialized = false;

// Initialize the database
const initDatabase = async () => {
  try {
    if (isInitialized) return db;

    // Open database connection
    db = await SQLite.openDatabaseAsync("FoodJournal.db");

    // Create tables
    await db.execAsync("PRAGMA journal_mode = WAL");

    await db.withTransactionAsync(async () => {
      await db.execAsync(
        `CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT, 
          email TEXT UNIQUE, 
          password TEXT
        );`
      );

      await db.execAsync(
        `CREATE TABLE IF NOT EXISTS journals (
          id INTEGER PRIMARY KEY AUTOINCREMENT, 
          userId INTEGER, 
          image TEXT, 
          description TEXT, 
          date TEXT, 
          category TEXT, 
          rating INTEGER DEFAULT 3,
          FOREIGN KEY(userId) REFERENCES users(id)
        );`
      );

      // await db.execAsync(
      //   "ALTER TABLE journals ADD COLUMN rating INTEGER DEFAULT 3"
      // );
    });

    isInitialized = true;
    console.log("Database initialized successfully");
    return db;
  } catch (error) {
    console.error("Database initialization error:", error);
    throw error;
  }
};

const getSql = async (query, params = []) => {
  try {
    if (!isInitialized) {
      await initDatabase();
    }

    const result = await db.getAllAsync(query, params);
    // console.log(result);
    return result;
  } catch (error) {
    console.error("SQL execution error:", error);
    throw error;
  }
};

// Execute SQL queries with automatic initialization
const executeSql = async (query, params = []) => {
  try {
    if (!isInitialized) {
      await initDatabase();
    }

    const result = await db.runAsync(query, params);
    // console.log(result);
    return result;
  } catch (error) {
    console.error("SQL execution error:", error);
    throw error;
  }
};

export { initDatabase, executeSql, getSql };

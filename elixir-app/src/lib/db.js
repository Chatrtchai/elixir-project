import mysql from "mysql2/promise";

const ssl = { minVersion: "TLSv1.2", rejectUnauthorized: true };

const DEFAULT_POOL_SIZE = 10;
const configuredPoolSize = Number.parseInt(
  process.env.DATABASE_POOL_SIZE ?? "",
  10
);
const pool = mysql.createPool({
  host: process.env.DATABASE_HOST,
  port: process.env.DATABASE_PORT,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  ssl,
  waitForConnections: true,
  connectionLimit:
    Number.isFinite(configuredPoolSize) && configuredPoolSize > 0
      ? configuredPoolSize
      : DEFAULT_POOL_SIZE,
  queueLimit: 0,
  enableKeepAlive: true,
});

export const createConnection = async () => {
  const connection = await pool.getConnection();

  const release = connection.release.bind(connection);
  connection.release = () => {
    release();
  };

  connection.end = connection.release;

  return connection;
};

export const db = pool;

export default pool;

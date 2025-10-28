import mysql from 'mysql2/promise';

const ssl = { minVersion: "TLSv1.2", rejectUnauthorized: true };

export const createConnection = async () => {
  const connection = await mysql.createConnection({
    host: process.env.DATABASE_HOST,
    port: process.env.DATABASE_PORT,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    ssl: ssl,
  });
  return connection;
}
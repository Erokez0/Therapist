import { DataSource } from "typeorm";
import dotenv from 'dotenv';
dotenv.config()
export const myDataSource = new DataSource({
    type: "postgres",
    host: process.env.host,
    port: 5432,
    username: process.env.POSTGRES_PASSWORD,
    password: process.env.POSTGRES_DB,
    database: process.env.POSTGRES_USER,
    entities: ['src/entity/*.ts'],
    logging: true,
    synchronize: true,
    connectTimeoutMS: 0
})
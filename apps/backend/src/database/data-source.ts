import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();



export const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'maplelaw',
    password: process.env.DB_PASSWORD || 'maplelaw_dev',
    database: process.env.DB_DATABASE || 'maplelaw',
    synchronize: false,
    logging: process.env.NODE_ENV === 'development',
    entities: ['src/**/*.entity.ts'],
    migrations: ['src/database/migrations/*.ts'],
    subscribers: [],
});

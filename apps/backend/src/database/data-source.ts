import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Support DATABASE_URL (Railway/Heroku style) or individual vars
const getDatabaseConfig = () => {
    if (process.env.DATABASE_URL) {
        return {
            type: 'postgres' as const,
            url: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        };
    }
    return {
        type: 'postgres' as const,
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        username: process.env.DB_USERNAME || 'maplelaw',
        password: process.env.DB_PASSWORD || 'maplelaw_dev',
        database: process.env.DB_DATABASE || 'maplelaw',
    };
};

export const AppDataSource = new DataSource({
    ...getDatabaseConfig(),
    synchronize: false,
    logging: process.env.NODE_ENV === 'development',
    entities: ['src/**/*.entity.ts'],
    migrations: ['src/database/migrations/*.ts'],
    subscribers: [],
});

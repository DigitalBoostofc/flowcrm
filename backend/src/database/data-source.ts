import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as path from 'path';

const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [path.join(__dirname, '..', '**', '*.entity.{ts,js}')],
  migrations: [path.join(__dirname, 'migrations', '*.{ts,js}')],
  migrationsRun: false,
  synchronize: false,
  logging: process.env.NODE_ENV !== 'production',
});

export default AppDataSource;

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/entities/user.entity';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);

  try {
    await usersService.create({
      name: 'Owner',
      email: process.env.OWNER_EMAIL || 'owner@flowcrm.com',
      password: process.env.OWNER_PASSWORD || 'flowcrm123',
      role: UserRole.OWNER,
    });
    console.log('✅ Owner user created');
  } catch {
    console.log('ℹ️ Owner already exists, skipping');
  }

  await app.close();
}

seed();

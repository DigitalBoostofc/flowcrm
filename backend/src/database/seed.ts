import { NestFactory } from '@nestjs/core';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../app.module';
import { UsersService } from '../users/users.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { UserRole } from '../users/entities/user.entity';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);
  const workspacesService = app.get(WorkspacesService);

  const email = process.env.OWNER_EMAIL || 'owner@flowcrm.com';
  const password = process.env.OWNER_PASSWORD || 'flowcrm123';
  const workspaceName = process.env.WORKSPACE_NAME || 'FlowCRM';

  try {
    const existing = await usersService.findByEmail(email);
    if (existing) {
      console.log(`ℹ️ Owner ${email} already exists, skipping`);
      await app.close();
      return;
    }

    const workspace = await workspacesService.create({ name: workspaceName });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await usersService.createInWorkspace(workspace.id, {
      name: 'Owner',
      email,
      passwordHash,
      role: UserRole.OWNER,
    });
    await workspacesService.updateOwner(workspace.id, user.id);
    console.log(`✅ Owner ${email} created in workspace ${workspace.id}`);
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

seed().finally(() => {
  // Force exit: BullMQ/Redis/Scheduler keep handles open in the event loop
  process.exit(process.exitCode ?? 0);
});

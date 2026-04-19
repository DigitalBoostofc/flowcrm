import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { TenantContext } from '../common/tenant/tenant-context.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private repo: Repository<User>,
    private readonly tenant: TenantContext,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const existing = await this.repo.findOne({ where: { workspaceId, email: dto.email } });
    if (existing) throw new ConflictException('Email já cadastrado');
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.repo.create({
      name: dto.name,
      email: dto.email,
      role: dto.role,
      passwordHash,
      workspaceId,
    });
    return this.repo.save(user);
  }

  async createInWorkspace(
    workspaceId: string,
    data: { name: string; email: string; passwordHash: string; role: User['role']; phone?: string | null; phoneVerified?: boolean },
  ): Promise<User> {
    const user = this.repo.create({ ...data, workspaceId });
    return this.repo.save(user);
  }

  findAll(): Promise<User[]> {
    const workspaceId = this.tenant.requireWorkspaceId();
    return this.repo.find({
      where: { workspaceId },
      select: ['id', 'name', 'email', 'role', 'active', 'createdAt'],
    });
  }

  async findOne(id: string): Promise<User> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const user = await this.repo.findOne({ where: { id, workspaceId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }

  findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email } });
  }

  findByEmailAndWorkspace(email: string, workspaceId: string): Promise<User | null> {
    return this.repo.findOne({ where: { email, workspaceId } });
  }

  async remove(id: string): Promise<void> {
    const workspaceId = this.tenant.requireWorkspaceId();
    await this.repo.update({ id, workspaceId }, { active: false });
  }
}

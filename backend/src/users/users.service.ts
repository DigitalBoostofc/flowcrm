import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { TenantContext } from '../common/tenant/tenant-context.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private repo: Repository<User>,
    private readonly tenant: TenantContext,
    private readonly storage: StorageService,
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
      select: ['id', 'name', 'email', 'role', 'active', 'createdAt', 'phone', 'avatarUrl'],
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

  async getProfile(userId: string): Promise<User> {
    const user = await this.repo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<User> {
    const user = await this.getProfile(userId);
    if (dto.name !== undefined) user.name = dto.name;
    if (dto.phone !== undefined) user.phone = dto.phone?.trim() || null;
    return this.repo.save(user);
  }

  async updateAvatar(userId: string, file: { buffer: Buffer; mimetype: string; originalname: string; size: number }): Promise<User> {
    const user = await this.getProfile(userId);
    const uploaded = await this.storage.uploadImage({ folder: 'avatars/users', file });
    const previousKey = user.avatarKey;
    user.avatarUrl = uploaded.url;
    user.avatarKey = uploaded.key;
    const saved = await this.repo.save(user);
    if (previousKey && previousKey !== uploaded.key) {
      this.storage.delete(previousKey).catch(() => undefined);
    }
    return saved;
  }

  async removeAvatar(userId: string): Promise<User> {
    const user = await this.getProfile(userId);
    const previousKey = user.avatarKey;
    user.avatarUrl = null;
    user.avatarKey = null;
    const saved = await this.repo.save(user);
    if (previousKey) this.storage.delete(previousKey).catch(() => undefined);
    return saved;
  }

  async setEmail(userId: string, email: string): Promise<User> {
    const user = await this.getProfile(userId);
    const existing = await this.repo.findOne({ where: { email, workspaceId: user.workspaceId, id: Not(userId) } });
    if (existing) throw new ConflictException('E-mail já utilizado por outro usuário.');
    user.email = email.toLowerCase();
    return this.repo.save(user);
  }

  async setPassword(userId: string, newPassword: string): Promise<void> {
    const hash = await bcrypt.hash(newPassword, 10);
    await this.repo.update(userId, { passwordHash: hash });
  }
}

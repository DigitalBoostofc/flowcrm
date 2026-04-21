import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from './entities/user.entity';
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

    if (dto.role === UserRole.OWNER) {
      throw new BadRequestException('Não é possível criar outro proprietário.');
    }

    if (dto.role === UserRole.MANAGER) {
      const count = await this.repo.count({ where: { workspaceId, role: UserRole.MANAGER, active: true } });
      if (count >= 1) throw new BadRequestException('Limite de 1 gerente atingido.');
    }
    if (dto.role === UserRole.SELLER) {
      const count = await this.repo.count({ where: { workspaceId, role: UserRole.SELLER, active: true } });
      if (count >= 3) throw new BadRequestException('Limite de 3 vendedores atingido.');
    }

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

  async updateRole(id: string, role: UserRole): Promise<User> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const user = await this.repo.findOne({ where: { id, workspaceId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    if (user.role === UserRole.OWNER) throw new BadRequestException('Não é possível alterar o papel do proprietário.');
    if (role === UserRole.OWNER) throw new BadRequestException('Não é possível promover para proprietário.');

    if (role === UserRole.MANAGER && user.role !== UserRole.MANAGER) {
      const count = await this.repo.count({ where: { workspaceId, role: UserRole.MANAGER, active: true } });
      if (count >= 1) throw new BadRequestException('Limite de 1 gerente atingido.');
    }
    if (role === UserRole.SELLER && user.role !== UserRole.SELLER) {
      const count = await this.repo.count({ where: { workspaceId, role: UserRole.SELLER, active: true } });
      if (count >= 3) throw new BadRequestException('Limite de 3 vendedores atingido.');
    }

    user.role = role;
    return this.repo.save(user);
  }

  async setActive(id: string, active: boolean): Promise<void> {
    const workspaceId = this.tenant.requireWorkspaceId();
    const user = await this.repo.findOne({ where: { id, workspaceId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    if (user.role === UserRole.OWNER) throw new BadRequestException('Não é possível desativar o proprietário.');
    await this.repo.update({ id, workspaceId }, { active });
  }

  async remove(id: string): Promise<void> {
    return this.setActive(id, false);
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

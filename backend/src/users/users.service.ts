import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private repo: Repository<User>,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const existing = await this.repo.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email já cadastrado');
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.repo.create({ name: dto.name, email: dto.email, role: dto.role, passwordHash });
    return this.repo.save(user);
  }

  findAll(): Promise<User[]> {
    return this.repo.find({ select: ['id', 'name', 'email', 'role', 'active', 'createdAt'] });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }

  findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email } });
  }

  async remove(id: string): Promise<void> {
    await this.repo.update(id, { active: false });
  }
}

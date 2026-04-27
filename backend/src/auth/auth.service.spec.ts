import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { OtpService } from '../otp/otp.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: Partial<UsersService>;

  const mockUser = {
    id: 'uuid-1',
    workspaceId: 'ws-1',
    email: 'owner@test.com',
    passwordHash: '',
    role: UserRole.OWNER,
    name: 'Owner',
    active: true,
  };

  beforeAll(async () => {
    mockUser.passwordHash = await bcrypt.hash('password123', 10);
  });

  beforeEach(async () => {
    usersService = {
      findByEmail: jest.fn().mockResolvedValue(mockUser),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('mock.jwt.token') } },
        { provide: getRepositoryToken(User), useValue: { findOne: jest.fn(), update: jest.fn() } },
        { provide: OtpService, useValue: { send: jest.fn(), verify: jest.fn(), consume: jest.fn() } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('returns token on valid credentials', async () => {
    const result = await service.login('owner@test.com', 'password123');
    expect(result.accessToken).toBe('mock.jwt.token');
    expect(result.user.email).toBe('owner@test.com');
  });

  it('throws on invalid password', async () => {
    await expect(service.login('owner@test.com', 'wrongpass')).rejects.toThrow();
  });

  it('throws on unknown email', async () => {
    (usersService.findByEmail as jest.Mock).mockResolvedValue(null);
    await expect(service.login('unknown@test.com', 'pass')).rejects.toThrow();
  });
});

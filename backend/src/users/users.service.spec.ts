import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User, UserRole } from './entities/user.entity';

describe('UsersService', () => {
  let service: UsersService;
  const mockRepo = {
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn().mockImplementation((u) => Promise.resolve({ id: 'uuid-1', ...u })),
    update: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: mockRepo },
      ],
    }).compile();
    service = module.get<UsersService>(UsersService);
  });

  it('creates a user with hashed password', async () => {
    mockRepo.findOne.mockResolvedValueOnce(null);
    const user = await service.create({
      name: 'Agent',
      email: 'agent@test.com',
      password: 'secret123',
      role: UserRole.AGENT,
    });
    expect(user.id).toBe('uuid-1');
    expect(user['passwordHash']).not.toBe('secret123');
  });

  it('findAll returns array', async () => {
    const users = await service.findAll();
    expect(Array.isArray(users)).toBe(true);
  });
});

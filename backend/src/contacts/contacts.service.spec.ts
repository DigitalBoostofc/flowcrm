import { Test, TestingModule } from '@nestjs/testing';
import { ContactsService } from './contacts.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Contact } from './entities/contact.entity';

describe('ContactsService', () => {
  let service: ContactsService;
  const mockRepo = {
    findOne: jest.fn().mockResolvedValue(null),
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockImplementation((d) => d),
    save: jest.fn().mockImplementation((c) => Promise.resolve({ id: 'uuid-c1', ...c })),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactsService,
        { provide: getRepositoryToken(Contact), useValue: mockRepo },
      ],
    }).compile();
    service = module.get<ContactsService>(ContactsService);
  });

  it('creates a contact', async () => {
    const c = await service.create({ name: 'João', phone: '+5511999999999' });
    expect(c.id).toBe('uuid-c1');
    expect(c.name).toBe('João');
  });

  it('findOrCreateByPhone returns existing contact if phone matches', async () => {
    const existing = { id: 'uuid-c2', name: 'Existing', phone: '+5511888888888' };
    mockRepo.findOne.mockResolvedValueOnce(existing);
    const c = await service.findOrCreateByPhone('+5511888888888', 'Existing');
    expect(c.id).toBe('uuid-c2');
  });

  it('findOrCreateByPhone creates new contact if not found', async () => {
    mockRepo.findOne.mockResolvedValueOnce(null);
    const c = await service.findOrCreateByPhone('+5511777777777', 'Novo');
    expect(c.id).toBe('uuid-c1');
  });
});

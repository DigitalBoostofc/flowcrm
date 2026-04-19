import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { Task, TaskStatus } from './entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { QueryTasksDto } from './dto/query-tasks.dto';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private repo: Repository<Task>,
  ) {}

  create(dto: CreateTaskDto, createdById?: string): Promise<Task> {
    const task = this.repo.create({
      ...dto,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      responsibleIds: dto.responsibleIds ?? [],
      attachments: dto.attachments ?? [],
      createdById: createdById ?? null,
    });
    return this.repo.save(task);
  }

  async findAll(query: QueryTasksDto): Promise<Task[]> {
    const qb = this.repo.createQueryBuilder('task').orderBy('task.dueDate', 'ASC', 'NULLS LAST');

    if (query.status) qb.andWhere('task.status = :status', { status: query.status });
    if (query.type) qb.andWhere('task.type = :type', { type: query.type });
    if (query.assigneeId) {
      qb.andWhere(`task.responsibleIds @> :assignee::jsonb`, {
        assignee: JSON.stringify([query.assigneeId]),
      });
    }
    if (query.targetType) qb.andWhere('task.targetType = :targetType', { targetType: query.targetType });
    if (query.targetId) qb.andWhere('task.targetId = :targetId', { targetId: query.targetId });

    const now = new Date();
    if (query.range === 'today') {
      const start = new Date(now); start.setHours(0, 0, 0, 0);
      const end = new Date(now); end.setHours(23, 59, 59, 999);
      qb.andWhere('task.dueDate BETWEEN :s AND :e', { s: start, e: end });
    } else if (query.range === 'week') {
      const start = new Date(now); start.setHours(0, 0, 0, 0);
      const end = new Date(start); end.setDate(end.getDate() + 7);
      qb.andWhere('task.dueDate BETWEEN :s AND :e', { s: start, e: end });
    } else {
      if (query.dueFrom) qb.andWhere('task.dueDate >= :from', { from: new Date(query.dueFrom) });
      if (query.dueTo) qb.andWhere('task.dueDate <= :to', { to: new Date(query.dueTo) });
    }

    return qb.getMany();
  }

  async findOne(id: string): Promise<Task> {
    const task = await this.repo.findOne({ where: { id } });
    if (!task) throw new NotFoundException('Tarefa não encontrada');
    return task;
  }

  async update(id: string, dto: UpdateTaskDto): Promise<Task> {
    const task = await this.findOne(id);
    Object.assign(task, {
      ...dto,
      dueDate: dto.dueDate !== undefined ? (dto.dueDate ? new Date(dto.dueDate) : null) : task.dueDate,
    });
    return this.repo.save(task);
  }

  async complete(id: string): Promise<Task> {
    const task = await this.findOne(id);
    task.status = TaskStatus.COMPLETED;
    task.completedAt = new Date();
    return this.repo.save(task);
  }

  async reopen(id: string): Promise<Task> {
    const task = await this.findOne(id);
    task.status = TaskStatus.PENDING;
    task.completedAt = null;
    return this.repo.save(task);
  }

  async remove(id: string): Promise<void> {
    const result = await this.repo.delete(id);
    if (result.affected === 0) throw new NotFoundException('Tarefa não encontrada');
  }
}

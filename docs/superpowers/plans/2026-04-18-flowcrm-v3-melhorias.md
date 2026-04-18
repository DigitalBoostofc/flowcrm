# FlowCRM v3 — Melhorias e Novas Funcionalidades

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar 7 melhorias no FlowCRM: motivos de perda como CRUD, toasts em tempo real, página de analytics, busca global, tags nos leads, arquivamento e importação CSV de contatos.

**Architecture:** Backend NestJS com novos módulos (analytics, search, loss-reasons) + migration SQL para novos campos + Frontend React com nova página Analytics e componentes UI (Toast, GlobalSearch, LeadTags).

**Tech Stack:** NestJS, TypeORM, PostgreSQL, React, TailwindCSS, React Query, Zustand, recharts (novo), papaparse (novo)

---

## Instalação de pacotes (rodar antes de iniciar)

```bash
cd frontend && npm install recharts papaparse @types/papaparse
```

---

## Task 1: Motivos de Perda — Backend CRUD

**Files:**
- Create: `backend/src/loss-reasons/entities/loss-reason.entity.ts`
- Create: `backend/src/loss-reasons/dto/create-loss-reason.dto.ts`
- Create: `backend/src/loss-reasons/loss-reasons.service.ts`
- Create: `backend/src/loss-reasons/loss-reasons.controller.ts`
- Create: `backend/src/loss-reasons/loss-reasons.module.ts`
- Create: `backend/src/database/migrations/1714300000000-LossReasons.ts`
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Criar entity**

```typescript
// backend/src/loss-reasons/entities/loss-reason.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('loss_reasons')
export class LossReason {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  label: string;

  @CreateDateColumn()
  createdAt: Date;
}
```

- [ ] **Step 2: Criar DTO**

```typescript
// backend/src/loss-reasons/dto/create-loss-reason.dto.ts
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateLossReasonDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  label: string;
}
```

- [ ] **Step 3: Criar service**

```typescript
// backend/src/loss-reasons/loss-reasons.service.ts
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LossReason } from './entities/loss-reason.entity';
import { CreateLossReasonDto } from './dto/create-loss-reason.dto';

@Injectable()
export class LossReasonsService {
  constructor(
    @InjectRepository(LossReason)
    private repo: Repository<LossReason>,
  ) {}

  findAll(): Promise<LossReason[]> {
    return this.repo.find({ order: { label: 'ASC' } });
  }

  async create(dto: CreateLossReasonDto): Promise<LossReason> {
    const existing = await this.repo.findOne({ where: { label: dto.label } });
    if (existing) throw new ConflictException('Motivo já existe');
    const reason = this.repo.create(dto);
    return this.repo.save(reason);
  }

  async remove(id: string): Promise<void> {
    const result = await this.repo.delete(id);
    if (result.affected === 0) throw new NotFoundException('Motivo não encontrado');
  }
}
```

- [ ] **Step 4: Criar controller**

```typescript
// backend/src/loss-reasons/loss-reasons.controller.ts
import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { LossReasonsService } from './loss-reasons.service';
import { CreateLossReasonDto } from './dto/create-loss-reason.dto';

@Controller('api/loss-reasons')
@UseGuards(JwtAuthGuard)
export class LossReasonsController {
  constructor(private service: LossReasonsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('owner')
  create(@Body() dto: CreateLossReasonDto) {
    return this.service.create(dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('owner')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
```

- [ ] **Step 5: Criar module**

```typescript
// backend/src/loss-reasons/loss-reasons.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LossReason } from './entities/loss-reason.entity';
import { LossReasonsService } from './loss-reasons.service';
import { LossReasonsController } from './loss-reasons.controller';

@Module({
  imports: [TypeOrmModule.forFeature([LossReason])],
  controllers: [LossReasonsController],
  providers: [LossReasonsService],
})
export class LossReasonsModule {}
```

- [ ] **Step 6: Criar migration**

```typescript
// backend/src/database/migrations/1714300000000-LossReasons.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class LossReasons1714300000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "loss_reasons" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "label" character varying NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_loss_reasons_label" UNIQUE ("label"),
        CONSTRAINT "PK_loss_reasons" PRIMARY KEY ("id")
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "loss_reasons"`);
  }
}
```

- [ ] **Step 7: Registrar module em app.module.ts**

Adicionar no array `imports` de `backend/src/app.module.ts`:
```typescript
import { LossReasonsModule } from './loss-reasons/loss-reasons.module';
// ...
LossReasonsModule,
```

---

## Task 2: Motivos de Perda — Frontend CRUD

**Files:**
- Create: `frontend/src/api/loss-reasons.ts`
- Modify: `frontend/src/types/api.ts`
- Modify: `frontend/src/components/settings/LossReasonsTab.tsx`
- Modify: `frontend/src/components/lead-panel/StatusToggle.tsx`

- [ ] **Step 1: API client**

```typescript
// frontend/src/api/loss-reasons.ts
import api from './client';

export interface LossReason {
  id: string;
  label: string;
  createdAt: string;
}

export const listLossReasons = (): Promise<LossReason[]> =>
  api.get('/loss-reasons').then((r) => r.data);

export const createLossReason = (label: string): Promise<LossReason> =>
  api.post('/loss-reasons', { label }).then((r) => r.data);

export const deleteLossReason = (id: string): Promise<void> =>
  api.delete(`/loss-reasons/${id}`).then((r) => r.data);
```

- [ ] **Step 2: Substituir LossReasonsTab.tsx**

```tsx
// frontend/src/components/settings/LossReasonsTab.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, Plus } from 'lucide-react';
import { listLossReasons, createLossReason, deleteLossReason } from '@/api/loss-reasons';

export default function LossReasonsTab() {
  const qc = useQueryClient();
  const [input, setInput] = useState('');

  const { data: reasons = [], isLoading } = useQuery({
    queryKey: ['loss-reasons'],
    queryFn: listLossReasons,
  });

  const addMutation = useMutation({
    mutationFn: createLossReason,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['loss-reasons'] });
      setInput('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteLossReason,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loss-reasons'] }),
  });

  const handleAdd = () => {
    const label = input.trim();
    if (!label) return;
    addMutation.mutate(label);
  };

  return (
    <div className="space-y-4 max-w-lg">
      <p className="text-slate-400 text-sm">
        Defina os motivos de perda padrão da sua operação. Ao marcar um lead como{' '}
        <strong className="text-red-400">Perdido</strong>, o agente escolherá um destes motivos.
      </p>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Novo motivo de perda..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-brand-500"
        />
        <button
          onClick={handleAdd}
          disabled={addMutation.isPending || !input.trim()}
          className="flex items-center gap-1.5 px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          Adicionar
        </button>
      </div>

      {isLoading ? (
        <div className="text-slate-500 text-sm">Carregando...</div>
      ) : reasons.length === 0 ? (
        <div className="text-slate-500 text-sm">Nenhum motivo cadastrado.</div>
      ) : (
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          {reasons.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 last:border-0"
            >
              <span className="text-sm text-slate-200">{r.label}</span>
              <button
                onClick={() => deleteMutation.mutate(r.id)}
                disabled={deleteMutation.isPending}
                className="p-1 text-slate-500 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Atualizar StatusToggle para usar motivos do banco**

Substituir o conteúdo do Modal em `frontend/src/components/lead-panel/StatusToggle.tsx`:

```tsx
// frontend/src/components/lead-panel/StatusToggle.tsx
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trophy, CircleDot, XCircle } from 'lucide-react';
import { updateLeadStatus } from '@/api/leads';
import { listLossReasons } from '@/api/loss-reasons';
import type { Lead, LeadStatus } from '@/types/api';
import Modal from '@/components/ui/Modal';

interface Props {
  lead: Lead;
}

const STATUS_CONFIG = {
  active: { label: 'Em andamento', icon: CircleDot, color: 'text-slate-400 bg-slate-700' },
  won: { label: 'Ganho', icon: Trophy, color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30' },
  lost: { label: 'Perdido', icon: XCircle, color: 'text-red-400 bg-red-400/10 border-red-400/30' },
} as const;

export default function StatusToggle({ lead }: Props) {
  const qc = useQueryClient();
  const [showLossModal, setShowLossModal] = useState(false);
  const [lossReason, setLossReason] = useState('');

  const { data: reasons = [] } = useQuery({
    queryKey: ['loss-reasons'],
    queryFn: () => import('@/api/loss-reasons').then((m) => m.listLossReasons()),
    enabled: showLossModal,
  });

  const mutation = useMutation({
    mutationFn: ({ status, reason }: { status: LeadStatus; reason?: string }) =>
      updateLeadStatus(lead.id, status, reason),
    onSuccess: (updated) => {
      qc.setQueryData<Lead>(['lead', lead.id], updated);
      qc.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  const handleClick = (status: LeadStatus) => {
    if (status === lead.status) return;
    if (status === 'lost') {
      setLossReason('');
      setShowLossModal(true);
      return;
    }
    mutation.mutate({ status });
  };

  const confirmLoss = () => {
    mutation.mutate({ status: 'lost', reason: lossReason || undefined });
    setShowLossModal(false);
  };

  return (
    <>
      <div className="flex gap-1 p-1 bg-slate-900/50 rounded-lg border border-slate-700">
        {(['active', 'won', 'lost'] as LeadStatus[]).map((s) => {
          const cfg = STATUS_CONFIG[s];
          const Icon = cfg.icon;
          const active = lead.status === s;
          return (
            <button
              key={s}
              onClick={() => handleClick(s)}
              disabled={mutation.isPending}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all border ${
                active ? cfg.color + ' border-current/20' : 'text-slate-500 border-transparent hover:text-slate-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {cfg.label}
            </button>
          );
        })}
      </div>

      <Modal open={showLossModal} onClose={() => setShowLossModal(false)} title="Motivo da perda">
        <div className="p-4 space-y-4">
          <p className="text-sm text-slate-400">Selecione ou digite o motivo da perda.</p>
          {reasons.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {reasons.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setLossReason(r.label)}
                  className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                    lossReason === r.label
                      ? 'bg-red-500/20 border-red-500/50 text-red-300'
                      : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}
          <input
            autoFocus={reasons.length === 0}
            type="text"
            placeholder="Ou descreva o motivo..."
            value={lossReason}
            onChange={(e) => setLossReason(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && confirmLoss()}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-brand-500"
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowLossModal(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white">
              Cancelar
            </button>
            <button
              onClick={confirmLoss}
              className="px-4 py-2 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg"
            >
              Confirmar perda
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
```

---

## Task 3: In-App Toast Notifications

**Files:**
- Create: `frontend/src/store/toast.store.ts`
- Create: `frontend/src/components/ui/Toaster.tsx`
- Modify: `frontend/src/hooks/useNotifications.ts`
- Modify: `frontend/src/components/layout/AppShell.tsx`

- [ ] **Step 1: Criar toast store**

```typescript
// frontend/src/store/toast.store.ts
import { create } from 'zustand';

export interface Toast {
  id: string;
  title: string;
  body?: string;
  type?: 'info' | 'success' | 'error';
  leadId?: string;
}

interface ToastStore {
  toasts: Toast[];
  push: (toast: Omit<Toast, 'id'>) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (toast) => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 5000);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
```

- [ ] **Step 2: Criar Toaster component**

```tsx
// frontend/src/components/ui/Toaster.tsx
import { X, MessageCircle } from 'lucide-react';
import { useToastStore } from '@/store/toast.store';
import { usePanelStore } from '@/store/panel.store';

export default function Toaster() {
  const { toasts, dismiss } = useToastStore();
  const openPanel = usePanelStore((s) => s.open);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-4 flex items-start gap-3 animate-slide-in"
        >
          <div className="w-8 h-8 rounded-full bg-brand-600/20 text-brand-400 flex items-center justify-center flex-shrink-0">
            <MessageCircle className="w-4 h-4" />
          </div>
          <div
            className="flex-1 min-w-0 cursor-pointer"
            onClick={() => {
              if (t.leadId) openPanel(t.leadId);
              dismiss(t.id);
            }}
          >
            <p className="text-sm font-medium text-slate-100 truncate">{t.title}</p>
            {t.body && <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{t.body}</p>}
          </div>
          <button onClick={() => dismiss(t.id)} className="text-slate-500 hover:text-slate-300 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Adicionar animação ao tailwind.config.js**

Em `frontend/tailwind.config.js`, adicionar no `extend`:
```js
keyframes: {
  'slide-in': {
    '0%': { transform: 'translateX(100%)', opacity: '0' },
    '100%': { transform: 'translateX(0)', opacity: '1' },
  },
},
animation: {
  'slide-in': 'slide-in 0.2s ease-out',
},
```

- [ ] **Step 4: Atualizar useNotifications para usar toasts**

```typescript
// frontend/src/hooks/useNotifications.ts
import { useEffect } from 'react';
import { useWs } from './useWebSocket';
import { useToastStore } from '@/store/toast.store';
import type { Message, Lead, Contact } from '@/types/api';

export function useNotifications() {
  const { socket } = useWs();
  const pushToast = useToastStore((s) => s.push);

  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handler = (evt: { message: Message; lead: Lead & { contact?: Contact } }) => {
      const contactName = evt.lead.contact?.name ?? 'Nova mensagem';
      const body = evt.message.body.slice(0, 120);

      // Browser notification quando aba está em background
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.hidden) {
        try {
          new Notification(contactName, { body, tag: `flowcrm-lead-${evt.lead.id}` });
        } catch { /* noop */ }
      }

      // Toast in-app sempre
      pushToast({ title: contactName, body, leadId: evt.lead.id });
    };

    socket.on('message.received', handler);
    return () => { socket.off('message.received', handler); };
  }, [socket, pushToast]);
}
```

- [ ] **Step 5: Adicionar Toaster ao AppShell**

```tsx
// frontend/src/components/layout/AppShell.tsx
import type { ReactNode } from 'react';
import Sidebar from './Sidebar';
import LeadPanel from '@/components/lead-panel/LeadPanel';
import Toaster from '@/components/ui/Toaster';

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="h-screen flex bg-slate-950">
      <Sidebar />
      <main className="flex-1 overflow-auto">{children}</main>
      <LeadPanel />
      <Toaster />
    </div>
  );
}
```

---

## Task 4: Analytics — Backend

**Files:**
- Create: `backend/src/analytics/analytics.service.ts`
- Create: `backend/src/analytics/analytics.controller.ts`
- Create: `backend/src/analytics/analytics.module.ts`
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Criar service**

```typescript
// backend/src/analytics/analytics.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead, LeadStatus } from '../leads/entities/lead.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Lead)
    private leads: Repository<Lead>,
  ) {}

  async getSummary(pipelineId?: string) {
    const where: any = {};
    if (pipelineId) where.pipelineId = pipelineId;

    const all = await this.leads.find({
      where,
      relations: ['stage', 'assignedTo'],
    });

    const active = all.filter((l) => l.status === LeadStatus.ACTIVE);
    const won = all.filter((l) => l.status === LeadStatus.WON);
    const lost = all.filter((l) => l.status === LeadStatus.LOST);

    const sum = (arr: Lead[]) =>
      arr.reduce((acc, l) => acc + (Number(l.value) || 0), 0);

    const conversionRate =
      won.length + lost.length > 0
        ? Math.round((won.length / (won.length + lost.length)) * 100)
        : 0;

    // Tempo médio de conversão (lead ganho): dias entre createdAt e updatedAt
    const avgDaysToWin =
      won.length > 0
        ? Math.round(
            won.reduce((acc, l) => {
              const days =
                (new Date(l.updatedAt).getTime() - new Date(l.createdAt).getTime()) /
                86400000;
              return acc + days;
            }, 0) / won.length,
          )
        : 0;

    // Leads por etapa
    const byStage: Record<string, { count: number; value: number; stageName: string }> = {};
    for (const l of active) {
      if (!byStage[l.stageId]) {
        byStage[l.stageId] = { count: 0, value: 0, stageName: l.stage?.name ?? '' };
      }
      byStage[l.stageId].count++;
      byStage[l.stageId].value += Number(l.value) || 0;
    }

    // Leads por agente
    const byAgent: Record<string, { name: string; active: number; won: number; lost: number; value: number }> = {};
    for (const l of all) {
      const key = l.assignedToId ?? '__unassigned__';
      if (!byAgent[key]) {
        byAgent[key] = { name: l.assignedTo?.name ?? 'Sem responsável', active: 0, won: 0, lost: 0, value: 0 };
      }
      byAgent[key][l.status]++;
      byAgent[key].value += Number(l.value) || 0;
    }

    // Motivos de perda mais frequentes
    const lossReasonCount: Record<string, number> = {};
    for (const l of lost) {
      const reason = l.lossReason ?? 'Sem motivo';
      lossReasonCount[reason] = (lossReasonCount[reason] ?? 0) + 1;
    }
    const topLossReasons = Object.entries(lossReasonCount)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Leads criados nos últimos 30 dias por dia
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentLeads = all.filter((l) => new Date(l.createdAt) >= thirtyDaysAgo);
    const leadsByDay: Record<string, number> = {};
    for (const l of recentLeads) {
      const day = new Date(l.createdAt).toISOString().split('T')[0];
      leadsByDay[day] = (leadsByDay[day] ?? 0) + 1;
    }

    return {
      totals: {
        active: active.length,
        won: won.length,
        lost: lost.length,
        total: all.length,
      },
      values: {
        active: sum(active),
        won: sum(won),
        lost: sum(lost),
        forecast: sum(active),
      },
      conversionRate,
      avgDaysToWin,
      byStage: Object.entries(byStage).map(([stageId, data]) => ({ stageId, ...data })),
      byAgent: Object.entries(byAgent).map(([agentId, data]) => ({ agentId, ...data })),
      topLossReasons,
      leadsByDay,
    };
  }
}
```

- [ ] **Step 2: Criar controller**

```typescript
// backend/src/analytics/analytics.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';

@Controller('api/analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private service: AnalyticsService) {}

  @Get('summary')
  getSummary(@Query('pipelineId') pipelineId?: string) {
    return this.service.getSummary(pipelineId);
  }
}
```

- [ ] **Step 3: Criar module**

```typescript
// backend/src/analytics/analytics.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lead } from '../leads/entities/lead.entity';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Lead])],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
```

- [ ] **Step 4: Registrar em app.module.ts**

```typescript
import { AnalyticsModule } from './analytics/analytics.module';
// Adicionar ao array imports:
AnalyticsModule,
```

---

## Task 5: Analytics — Frontend

**Files:**
- Create: `frontend/src/api/analytics.ts`
- Create: `frontend/src/pages/Analytics.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/layout/Sidebar.tsx`

- [ ] **Step 1: API client**

```typescript
// frontend/src/api/analytics.ts
import api from './client';

export interface AnalyticsSummary {
  totals: { active: number; won: number; lost: number; total: number };
  values: { active: number; won: number; lost: number; forecast: number };
  conversionRate: number;
  avgDaysToWin: number;
  byStage: { stageId: string; stageName: string; count: number; value: number }[];
  byAgent: { agentId: string; name: string; active: number; won: number; lost: number; value: number }[];
  topLossReasons: { reason: string; count: number }[];
  leadsByDay: Record<string, number>;
}

export const getAnalyticsSummary = (pipelineId?: string): Promise<AnalyticsSummary> =>
  api.get('/analytics/summary', { params: pipelineId ? { pipelineId } : {} }).then((r) => r.data);
```

- [ ] **Step 2: Criar página Analytics.tsx**

```tsx
// frontend/src/pages/Analytics.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Trophy, XCircle, CircleDot, DollarSign, Clock } from 'lucide-react';
import { getAnalyticsSummary } from '@/api/analytics';
import { listPipelines } from '@/api/pipelines';
import { formatBRL } from '@/lib/format';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

function MetricCard({ icon, label, value, sub, color = 'text-slate-100' }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="text-slate-500">{icon}</div>
        <span className="text-xs text-slate-500 uppercase tracking-wide">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function Analytics() {
  const [pipelineId, setPipelineId] = useState<string | null>(null);

  const { data: pipelines = [] } = useQuery({ queryKey: ['pipelines'], queryFn: listPipelines });
  const { data, isLoading } = useQuery({
    queryKey: ['analytics', pipelineId],
    queryFn: () => getAnalyticsSummary(pipelineId ?? undefined),
  });

  const leadsByDayData = data
    ? Object.entries(data.leadsByDay)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-14)
        .map(([date, count]) => ({
          date: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          leads: count,
        }))
    : [];

  const pieData = data
    ? [
        { name: 'Ativo', value: data.totals.active, color: '#3b82f6' },
        { name: 'Ganho', value: data.totals.won, color: '#10b981' },
        { name: 'Perdido', value: data.totals.lost, color: '#ef4444' },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <select
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm"
          value={pipelineId ?? ''}
          onChange={(e) => setPipelineId(e.target.value || null)}
        >
          <option value="">Todos os pipelines</option>
          {pipelines.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {isLoading || !data ? (
        <div className="text-slate-500 text-sm">Carregando...</div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <MetricCard icon={<CircleDot className="w-4 h-4" />} label="Em andamento" value={data.totals.active} />
            <MetricCard icon={<Trophy className="w-4 h-4" />} label="Ganhos" value={data.totals.won} color="text-emerald-400" />
            <MetricCard icon={<XCircle className="w-4 h-4" />} label="Perdidos" value={data.totals.lost} color="text-red-400" />
            <MetricCard icon={<TrendingUp className="w-4 h-4" />} label="Conversão" value={`${data.conversionRate}%`} color="text-brand-400" />
            <MetricCard icon={<DollarSign className="w-4 h-4" />} label="Valor ganho" value={formatBRL(data.values.won)} color="text-emerald-400" />
            <MetricCard icon={<Clock className="w-4 h-4" />} label="Dias médios" value={data.avgDaysToWin} sub="para fechar" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart: Leads por dia */}
            <div className="lg:col-span-2 bg-slate-800 border border-slate-700 rounded-xl p-4">
              <h3 className="text-sm font-medium text-slate-200 mb-4">Leads criados (últimos 14 dias)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={leadsByDayData}>
                  <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9' }}
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  />
                  <Bar dataKey="leads" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie: Distribuição de status */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <h3 className="text-sm font-medium text-slate-200 mb-4">Distribuição de status</h3>
              {pieData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={150}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col gap-1 mt-2">
                    {pieData.map((d) => (
                      <div key={d.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                          <span className="text-slate-400">{d.name}</span>
                        </div>
                        <span className="text-slate-200 font-medium">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-slate-500 text-sm text-center py-8">Sem dados</div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Por agente */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <h3 className="text-sm font-medium text-slate-200 mb-3">Por agente</h3>
              {data.byAgent.length === 0 ? (
                <p className="text-slate-500 text-sm">Sem dados</p>
              ) : (
                <div className="space-y-2">
                  {data.byAgent.map((a) => (
                    <div key={a.agentId} className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">
                      <div>
                        <div className="text-sm text-slate-200">{a.name}</div>
                        <div className="text-xs text-slate-500">
                          {a.active} ativos · <span className="text-emerald-400">{a.won} ganhos</span> · <span className="text-red-400">{a.lost} perdidos</span>
                        </div>
                      </div>
                      <div className="text-sm text-slate-300">{formatBRL(a.value)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Motivos de perda */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <h3 className="text-sm font-medium text-slate-200 mb-3">Principais motivos de perda</h3>
              {data.topLossReasons.length === 0 ? (
                <p className="text-slate-500 text-sm">Sem dados</p>
              ) : (
                <div className="space-y-2">
                  {data.topLossReasons.map((r, i) => (
                    <div key={r.reason} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: COLORS[i] + '33', color: COLORS[i] }}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-slate-200 truncate">{r.reason}</div>
                        <div className="mt-1 bg-slate-700 rounded-full h-1.5">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${(r.count / data.topLossReasons[0].count) * 100}%`,
                              background: COLORS[i],
                            }}
                          />
                        </div>
                      </div>
                      <span className="text-xs text-slate-400 flex-shrink-0">{r.count}x</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Registrar rota em App.tsx**

Adicionar import e route em `frontend/src/App.tsx`:
```tsx
import Analytics from '@/pages/Analytics';
// Na rota autenticada, após contacts:
<Route path="analytics" element={<Analytics />} />
```

- [ ] **Step 4: Adicionar link no Sidebar**

Em `frontend/src/components/layout/Sidebar.tsx`, adicionar import e NavLink:
```tsx
import { LayoutDashboard, Users, Settings as SettingsIcon, LogOut, ListChecks, BarChart2 } from 'lucide-react';
// Após link de Contatos:
<NavLink to="/analytics" className={navClass}>
  <BarChart2 className="w-4 h-4" />
  Analytics
</NavLink>
```

---

## Task 6: Busca Global

**Files:**
- Create: `backend/src/search/search.service.ts`
- Create: `backend/src/search/search.controller.ts`
- Create: `backend/src/search/search.module.ts`
- Modify: `backend/src/app.module.ts`
- Create: `frontend/src/api/search.ts`
- Create: `frontend/src/components/layout/GlobalSearch.tsx`
- Modify: `frontend/src/components/layout/AppShell.tsx`

- [ ] **Step 1: Backend search service**

```typescript
// backend/src/search/search.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Contact } from '../contacts/entities/contact.entity';
import { Lead } from '../leads/entities/lead.entity';

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(Contact) private contacts: Repository<Contact>,
    @InjectRepository(Lead) private leads: Repository<Lead>,
  ) {}

  async search(q: string) {
    if (!q || q.trim().length < 2) return { contacts: [], leads: [] };
    const term = q.trim();

    const contacts = await this.contacts.find({
      where: [{ name: ILike(`%${term}%`) }, { phone: ILike(`%${term}%`) }, { email: ILike(`%${term}%`) }],
      take: 5,
    });

    const leads = await this.leads.find({
      where: [{ title: ILike(`%${term}%`) }],
      relations: ['contact', 'stage', 'pipeline'],
      take: 5,
    });

    // Also search leads by contact name
    const leadsByContact = await this.leads
      .createQueryBuilder('lead')
      .leftJoinAndSelect('lead.contact', 'contact')
      .leftJoinAndSelect('lead.stage', 'stage')
      .leftJoinAndSelect('lead.pipeline', 'pipeline')
      .where('contact.name ILIKE :term', { term: `%${term}%` })
      .orWhere('contact.phone ILIKE :term', { term: `%${term}%` })
      .take(5)
      .getMany();

    const allLeads = [...leads, ...leadsByContact].filter(
      (l, i, arr) => arr.findIndex((x) => x.id === l.id) === i,
    ).slice(0, 5);

    return { contacts, leads: allLeads };
  }
}
```

- [ ] **Step 2: Backend search controller**

```typescript
// backend/src/search/search.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SearchService } from './search.service';

@Controller('api/search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private service: SearchService) {}

  @Get()
  search(@Query('q') q: string) {
    return this.service.search(q);
  }
}
```

- [ ] **Step 3: Backend search module**

```typescript
// backend/src/search/search.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contact } from '../contacts/entities/contact.entity';
import { Lead } from '../leads/entities/lead.entity';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Contact, Lead])],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
```

- [ ] **Step 4: Registrar em app.module.ts**

```typescript
import { SearchModule } from './search/search.module';
// Adicionar ao array imports:
SearchModule,
```

- [ ] **Step 5: Frontend API client**

```typescript
// frontend/src/api/search.ts
import api from './client';
import type { Contact, Lead } from '@/types/api';

export interface SearchResults {
  contacts: Contact[];
  leads: Lead[];
}

export const globalSearch = (q: string): Promise<SearchResults> =>
  api.get('/search', { params: { q } }).then((r) => r.data);
```

- [ ] **Step 6: Frontend GlobalSearch component**

```tsx
// frontend/src/components/layout/GlobalSearch.tsx
import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, User, Briefcase, X } from 'lucide-react';
import { globalSearch } from '@/api/search';
import { usePanelStore } from '@/store/panel.store';
import { useNavigate } from 'react-router-dom';

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const openPanel = usePanelStore((s) => s.open);
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ['search', q],
    queryFn: () => globalSearch(q),
    enabled: q.trim().length >= 2,
    staleTime: 10_000,
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-slate-500 hover:bg-slate-800 hover:text-slate-300 text-sm transition-colors"
      >
        <Search className="w-4 h-4" />
        <span>Buscar</span>
        <kbd className="ml-auto text-xs bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">⌘K</kbd>
      </button>
    );
  }

  const hasResults = data && (data.contacts.length > 0 || data.leads.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50" onClick={() => setOpen(false)}>
      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700">
          <Search className="w-4 h-4 text-slate-500 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Buscar contatos, leads..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="flex-1 bg-transparent text-slate-100 text-sm focus:outline-none placeholder:text-slate-500"
          />
          <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-300">
            <X className="w-4 h-4" />
          </button>
        </div>

        {q.trim().length >= 2 && (
          <div className="max-h-80 overflow-auto py-2">
            {!hasResults ? (
              <div className="px-4 py-6 text-center text-slate-500 text-sm">Nenhum resultado</div>
            ) : (
              <>
                {(data?.contacts ?? []).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { navigate('/contacts'); setOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-700 transition-colors text-left"
                  >
                    <div className="w-7 h-7 rounded-full bg-slate-700 text-slate-300 flex items-center justify-center text-xs font-bold flex-shrink-0">
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-sm text-slate-200">{c.name}</div>
                      {c.phone && <div className="text-xs text-slate-500">{c.phone}</div>}
                    </div>
                  </button>
                ))}
                {(data?.leads ?? []).map((l) => (
                  <button
                    key={l.id}
                    onClick={() => { openPanel(l.id); setOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-700 transition-colors text-left"
                  >
                    <div className="w-7 h-7 rounded-full bg-brand-600/20 text-brand-400 flex items-center justify-center text-xs flex-shrink-0">
                      <Briefcase className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-sm text-slate-200">{l.title || l.contact?.name}</div>
                      <div className="text-xs text-slate-500">{l.pipeline?.name} · {l.stage?.name}</div>
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Adicionar GlobalSearch ao Sidebar**

Em `frontend/src/components/layout/Sidebar.tsx`, adicionar antes do `<nav>`:
```tsx
import GlobalSearch from './GlobalSearch';
// Após o header da sidebar:
<div className="px-3 py-2 border-b border-slate-800">
  <GlobalSearch />
</div>
```

---

## Task 7: Arquivamento de Leads (Soft Delete)

**Files:**
- Create: `backend/src/database/migrations/1714400000000-LeadArchive.ts`
- Modify: `backend/src/leads/entities/lead.entity.ts`
- Modify: `backend/src/leads/leads.service.ts`
- Modify: `backend/src/leads/leads.controller.ts`
- Modify: `frontend/src/api/leads.ts`
- Modify: `frontend/src/components/lead-panel/LeadInfo.tsx`
- Modify: `frontend/src/types/api.ts`

- [ ] **Step 1: Migration**

```typescript
// backend/src/database/migrations/1714400000000-LeadArchive.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class LeadArchive1714400000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN IF EXISTS "archivedAt"`);
  }
}
```

- [ ] **Step 2: Atualizar lead entity**

Adicionar ao final dos campos em `backend/src/leads/entities/lead.entity.ts`:
```typescript
@Column({ type: 'timestamp', nullable: true })
archivedAt: Date | null;
```

- [ ] **Step 3: Atualizar leads service**

Adicionar método `archive` e filtrar arquivados em `findByPipeline`:
```typescript
// Em findByPipeline, adicionar no where:
where.archivedAt = IsNull(); // import { IsNull } from 'typeorm'

// Novo método:
async archive(id: string): Promise<Lead> {
  const lead = await this.findOne(id);
  lead.archivedAt = new Date();
  return this.repo.save(lead);
}

async unarchive(id: string): Promise<Lead> {
  const lead = await this.findOne(id);
  lead.archivedAt = null;
  return this.repo.save(lead);
}
```

Também adicionar `import { IsNull } from 'typeorm'` no topo.

- [ ] **Step 4: Atualizar leads controller**

```typescript
@Patch(':id/archive')
archive(@Param('id') id: string) {
  return this.service.archive(id);
}

@Patch(':id/unarchive')
unarchive(@Param('id') id: string) {
  return this.service.unarchive(id);
}
```

- [ ] **Step 5: Frontend API**

Adicionar em `frontend/src/api/leads.ts`:
```typescript
export const archiveLead = (id: string): Promise<Lead> =>
  api.patch(`/leads/${id}/archive`).then((r) => r.data);

export const unarchiveLead = (id: string): Promise<Lead> =>
  api.patch(`/leads/${id}/unarchive`).then((r) => r.data);
```

- [ ] **Step 6: Atualizar tipo Lead**

Em `frontend/src/types/api.ts`, adicionar ao tipo `Lead`:
```typescript
archivedAt?: string | null;
```

- [ ] **Step 7: Botão de arquivar no LeadInfo**

Em `frontend/src/components/lead-panel/LeadInfo.tsx`, adicionar após o `StatusToggle`:
```tsx
import { Archive, ArchiveRestore } from 'lucide-react';
import { archiveLead, unarchiveLead } from '@/api/leads';

// Mutation de arquivamento:
const archiveMutation = useMutation({
  mutationFn: lead.archivedAt ? () => unarchiveLead(leadId) : () => archiveLead(leadId),
  onSuccess: (updated) => {
    qc.setQueryData<Lead>(['lead', leadId], updated);
    qc.invalidateQueries({ queryKey: ['leads'] });
  },
});

// Botão após a div do StatusToggle:
<div className="px-4 pb-3 border-b border-slate-700/50">
  <button
    onClick={() => archiveMutation.mutate()}
    disabled={archiveMutation.isPending}
    className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
      lead.archivedAt
        ? 'text-brand-400 border-brand-400/30 hover:bg-brand-400/10'
        : 'text-slate-500 border-slate-700 hover:text-slate-300 hover:border-slate-600'
    }`}
  >
    {lead.archivedAt ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
    {lead.archivedAt ? 'Desarquivar lead' : 'Arquivar lead'}
  </button>
</div>
```

---

## Task 8: Importação CSV de Contatos

**Files:**
- Modify: `backend/src/contacts/contacts.service.ts`
- Modify: `backend/src/contacts/contacts.controller.ts`
- Create: `frontend/src/components/settings/ContactsImportTab.tsx` (ou inline em Contacts.tsx)
- Modify: `frontend/src/pages/Contacts.tsx`

- [ ] **Step 1: Backend bulk create**

Adicionar ao `backend/src/contacts/contacts.service.ts`:
```typescript
async bulkCreate(rows: { name: string; phone?: string; email?: string; origin?: string }[]): Promise<{ created: number; skipped: number }> {
  let created = 0;
  let skipped = 0;
  for (const row of rows) {
    if (!row.name?.trim()) { skipped++; continue; }
    if (row.phone) {
      const existing = await this.repo.findOne({ where: { phone: row.phone } });
      if (existing) { skipped++; continue; }
    }
    await this.create({ name: row.name.trim(), phone: row.phone?.trim(), email: row.email?.trim(), origin: row.origin?.trim() });
    created++;
  }
  return { created, skipped };
}
```

- [ ] **Step 2: Backend import endpoint**

Em `backend/src/contacts/contacts.controller.ts`, adicionar:
```typescript
@Post('import')
@UseGuards(RolesGuard)
@Roles('owner')
bulkImport(@Body() body: { rows: { name: string; phone?: string; email?: string; origin?: string }[] }) {
  return this.service.bulkCreate(body.rows);
}
```

- [ ] **Step 3: Frontend import component em Contacts.tsx**

Adicionar botão "Importar CSV" na página de contatos e modal de importação:

```tsx
// Adicionar ao início do componente Contacts.tsx:
import { useState, useRef } from 'react';
import Papa from 'papaparse';
import api from '@/api/client';

// Estado adicional:
const [importing, setImporting] = useState(false);
const [importResult, setImportResult] = useState<{ created: number; skipped: number } | null>(null);
const fileRef = useRef<HTMLInputElement>(null);

const handleImport = (file: File) => {
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: async (results) => {
      setImporting(true);
      try {
        const rows = (results.data as any[]).map((r) => ({
          name: r.nome || r.name || r.Name || '',
          phone: r.telefone || r.phone || r.Phone || '',
          email: r.email || r.Email || '',
          origin: r.origem || r.origin || '',
        }));
        const res = await api.post('/contacts/import', { rows });
        setImportResult(res.data);
        qc.invalidateQueries({ queryKey: ['contacts'] });
      } finally {
        setImporting(false);
      }
    },
  });
};
```

Adicionar ao header da página (junto com o contador de contatos):
```tsx
<div className="flex items-center gap-3">
  <span className="text-sm text-slate-400">{contacts.length} contato{contacts.length !== 1 ? 's' : ''}</span>
  <button
    onClick={() => fileRef.current?.click()}
    disabled={importing}
    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm"
  >
    <Upload className="w-3.5 h-3.5" />
    {importing ? 'Importando...' : 'Importar CSV'}
  </button>
  <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleImport(e.target.files[0]); }} />
</div>
```

E mostrar resultado se disponível:
```tsx
{importResult && (
  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-3 text-sm text-emerald-300 flex items-center justify-between">
    <span>{importResult.created} contatos importados, {importResult.skipped} ignorados (duplicatas ou vazios).</span>
    <button onClick={() => setImportResult(null)} className="text-emerald-400 hover:text-emerald-200">
      <X className="w-4 h-4" />
    </button>
  </div>
)}
```

Adicionar `Upload` ao import do lucide-react na página Contacts.tsx.

---

## Task 9: Validações Robustas nos DTOs

**Files a modificar:**
- `backend/src/leads/dto/create-lead.dto.ts`
- `backend/src/leads/dto/update-lead.dto.ts`
- `backend/src/leads/dto/update-lead-status.dto.ts`
- `backend/src/contacts/dto/create-contact.dto.ts`
- `backend/src/contacts/dto/update-contact.dto.ts`
- `backend/src/users/dto/create-user.dto.ts` (se existir)
- `backend/src/main.ts` — garantir `useGlobalPipes`

- [ ] **Step 1: Verificar ValidationPipe global em main.ts**

Abrir `backend/src/main.ts` e garantir que tem:
```typescript
import { ValidationPipe } from '@nestjs/common';
// No bootstrap():
app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
```

- [ ] **Step 2: Verificar e atualizar DTOs dos leads**

Verificar `backend/src/leads/dto/create-lead.dto.ts`. Deve ter:
```typescript
import { IsNotEmpty, IsString, IsOptional, IsUUID, IsNumber, IsDateString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateLeadDto {
  @IsNotEmpty()
  @IsUUID()
  contactId: string;

  @IsNotEmpty()
  @IsUUID()
  stageId: string;

  @IsNotEmpty()
  @IsUUID()
  pipelineId: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  value?: number;
}
```

- [ ] **Step 3: Atualizar UpdateLeadDto**

```typescript
// backend/src/leads/dto/update-lead.dto.ts
import { IsOptional, IsString, IsNumber, IsDateString, IsUUID, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateLeadDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  value?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  conclusionDate?: string;

  @IsOptional()
  @IsUUID()
  assignedToId?: string;
}
```

- [ ] **Step 4: Atualizar CreateContactDto**

Verificar `backend/src/contacts/dto/create-contact.dto.ts`. Deve ter:
```typescript
import { IsNotEmpty, IsString, IsOptional, IsEmail, MaxLength, Matches } from 'class-validator';

export class CreateContactDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  origin?: string;
}
```

---

## Verificação final

Após implementar todas as tasks:

- [ ] **Build backend**: `cd backend && npm run build` — deve compilar sem erros
- [ ] **Deploy**: commit + push para o GitHub, redeploy no EasyPanel
- [ ] **Testar Analytics**: acessar `/analytics` e verificar dados
- [ ] **Testar Loss Reasons**: ir em Configurações > Motivos de Perda, criar/deletar
- [ ] **Testar Busca**: pressionar Ctrl+K e buscar um contato
- [ ] **Testar Toast**: receber mensagem pelo WhatsApp e ver toast aparecer
- [ ] **Testar Arquivar**: abrir lead, ir em Dados, clicar "Arquivar lead"
- [ ] **Testar Import CSV**: ir em Contatos, importar CSV com colunas `nome,telefone,email`

import { OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

const FALLBACK_DEV_ORIGINS = ['http://localhost:5173', 'http://localhost:3000'];

function resolveCorsOrigin(): string | string[] | boolean {
  const fromEnv = process.env.FRONTEND_URL;
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV !== 'production') return FALLBACK_DEV_ORIGINS;
  return false;
}

@WebSocketGateway({ cors: { origin: resolveCorsOrigin(), credentials: true } })
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private logger = new Logger(NotificationsGateway.name);

  constructor(private jwt: JwtService, private config: ConfigService) {}

  handleConnection(client: Socket): void {
    const token =
      (client.handshake.auth?.token as string | undefined) ??
      (client.handshake.headers?.authorization ?? '').replace('Bearer ', '');
    if (!token) {
      client.disconnect(true);
      return;
    }
    try {
      const payload = this.jwt.verify(token, { secret: this.config.getOrThrow('JWT_SECRET') });
      const workspaceId: string | undefined = payload.workspaceId;
      const userId: string | undefined = payload.sub;
      const role: string | undefined = payload.role;
      if (!workspaceId || !userId || !role) {
        this.logger.warn('Socket auth payload missing workspaceId/sub/role');
        client.disconnect(true);
        return;
      }
      client.data.user = { id: userId, role, workspaceId };
      client.join(`ws:${workspaceId}`);
      client.join(`ws:${workspaceId}:role:${role}`);
      client.join(`ws:${workspaceId}:user:${userId}`);
      this.logger.debug(`Socket connected: workspace=${workspaceId} user=${userId} role=${role}`);
    } catch (err) {
      this.logger.warn(`Socket auth failed: ${(err as Error).message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`Socket disconnected: ${client.id}`);
  }

  emitToWorkspaceUser(workspaceId: string, userId: string, event: string, data: unknown): void {
    if (!workspaceId || !userId) return;
    this.server.to(`ws:${workspaceId}:user:${userId}`).emit(event, data);
  }

  emitToWorkspaceOwners(workspaceId: string, event: string, data: unknown): void {
    if (!workspaceId) return;
    this.server.to(`ws:${workspaceId}:role:owner`).emit(event, data);
  }

  emitToWorkspace(workspaceId: string, event: string, data: unknown): void {
    if (!workspaceId) return;
    this.server.to(`ws:${workspaceId}`).emit(event, data);
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { google } from 'googleapis';
import { UserIntegration } from './entities/user-integration.entity';

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);

  constructor(
    private config: ConfigService,
    @InjectRepository(UserIntegration) private repo: Repository<UserIntegration>,
  ) {}

  private createOAuth2Client() {
    return new google.auth.OAuth2(
      this.config.getOrThrow('GOOGLE_CLIENT_ID'),
      this.config.getOrThrow('GOOGLE_CLIENT_SECRET'),
      this.config.getOrThrow('GOOGLE_REDIRECT_URI'),
    );
  }

  getAuthUrl(userId: string): string {
    const oauth2 = this.createOAuth2Client();
    return oauth2.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: ['https://www.googleapis.com/auth/calendar.events'],
      state: Buffer.from(userId).toString('base64'),
    });
  }

  async handleCallback(code: string, state: string): Promise<string> {
    const userId = Buffer.from(state, 'base64').toString('utf8');
    const oauth2 = this.createOAuth2Client();
    const { tokens } = await oauth2.getToken(code);

    oauth2.setCredentials(tokens);
    const oauth2Api = google.oauth2({ version: 'v2', auth: oauth2 });
    const userInfo = await oauth2Api.userinfo.get();

    await this.repo.upsert(
      {
        userId,
        provider: 'google',
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token ?? null,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        accountEmail: userInfo.data.email ?? null,
      },
      { conflictPaths: ['userId', 'provider'] },
    );

    this.logger.log(`Google Calendar conectado para usuário ${userId}`);
    return userId;
  }

  async disconnect(userId: string): Promise<void> {
    await this.repo.delete({ userId, provider: 'google' });
  }

  async getStatus(userId: string): Promise<{ connected: boolean; email?: string }> {
    const integration = await this.repo.findOne({ where: { userId, provider: 'google' } });
    if (!integration) return { connected: false };
    return { connected: true, email: integration.accountEmail ?? undefined };
  }

  private async getValidClient(userId: string) {
    const integration = await this.repo.findOne({ where: { userId, provider: 'google' } });
    if (!integration) return null;

    const oauth2 = this.createOAuth2Client();
    oauth2.setCredentials({
      access_token: integration.accessToken,
      refresh_token: integration.refreshToken,
      expiry_date: integration.expiresAt?.getTime(),
    });

    // Refresh token if expired or about to expire (< 5 min)
    const expiresAt = integration.expiresAt?.getTime() ?? 0;
    if (Date.now() > expiresAt - 5 * 60 * 1000) {
      try {
        const { credentials } = await oauth2.refreshAccessToken();
        await this.repo.update(integration.id, {
          accessToken: credentials.access_token!,
          expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
        });
        oauth2.setCredentials(credentials);
      } catch (err: any) {
        this.logger.warn(`Token refresh falhou para usuário ${userId}: ${err.message}`);
        return null;
      }
    }

    return oauth2;
  }

  async createEvent(userId: string, params: {
    summary: string;
    description?: string;
    startAt: Date;
    endAt: Date;
  }): Promise<string | null> {
    const auth = await this.getValidClient(userId);
    if (!auth) return null;

    try {
      const calendar = google.calendar({ version: 'v3', auth });
      const res = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: {
          summary: params.summary,
          description: params.description,
          start: { dateTime: params.startAt.toISOString() },
          end:   { dateTime: params.endAt.toISOString() },
        },
      });
      return res.data.id ?? null;
    } catch (err: any) {
      this.logger.warn(`Falha ao criar evento no Google Calendar para ${userId}: ${err.message}`);
      return null;
    }
  }

  async deleteEvent(userId: string, eventId: string): Promise<void> {
    const auth = await this.getValidClient(userId);
    if (!auth) return;

    try {
      const calendar = google.calendar({ version: 'v3', auth });
      await calendar.events.delete({ calendarId: 'primary', eventId });
    } catch (err: any) {
      this.logger.warn(`Falha ao deletar evento ${eventId} para ${userId}: ${err.message}`);
    }
  }

  async updateEvent(userId: string, eventId: string, params: {
    summary: string;
    description?: string;
    startAt: Date;
    endAt: Date;
  }): Promise<void> {
    const auth = await this.getValidClient(userId);
    if (!auth) return;

    try {
      const calendar = google.calendar({ version: 'v3', auth });
      await calendar.events.update({
        calendarId: 'primary',
        eventId,
        requestBody: {
          summary: params.summary,
          description: params.description,
          start: { dateTime: params.startAt.toISOString() },
          end:   { dateTime: params.endAt.toISOString() },
        },
      });
    } catch (err: any) {
      this.logger.warn(`Falha ao atualizar evento ${eventId} para ${userId}: ${err.message}`);
    }
  }
}

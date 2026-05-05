import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as FormData from 'form-data';

@Injectable()
export class AudioTranscriptionService {
  private readonly logger = new Logger(AudioTranscriptionService.name);

  constructor(private readonly config: ConfigService) {}

  async transcribe(audioUrl: string): Promise<string> {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new ServiceUnavailableException('Transcrição não configurada (OPENAI_API_KEY ausente).');
    }

    // Download audio buffer
    let audioBuffer: Buffer;
    let mimeType: string;
    try {
      const resp = await axios.get(audioUrl, { responseType: 'arraybuffer', timeout: 30_000 });
      audioBuffer = Buffer.from(resp.data as ArrayBuffer);
      const ct = (resp.headers['content-type'] as string | undefined) ?? '';
      if (ct.includes('mp4') || ct.includes('m4a')) mimeType = 'audio/mp4';
      else if (ct.includes('wav')) mimeType = 'audio/wav';
      else if (ct.includes('mpeg') || ct.includes('mp3')) mimeType = 'audio/mp3';
      else if (ct.includes('webm')) mimeType = 'audio/webm';
      else mimeType = 'audio/ogg';
    } catch (err) {
      this.logger.error(`Falha ao baixar áudio: ${(err as Error).message}`);
      throw new ServiceUnavailableException('Não foi possível baixar o áudio para transcrição.');
    }

    const ext = mimeType.split('/')[1];
    const form = new FormData();
    form.append('file', audioBuffer, { filename: `audio.${ext}`, contentType: mimeType });
    form.append('model', 'whisper-1');
    form.append('language', 'pt');

    try {
      const res = await axios.post('https://api.openai.com/v1/audio/transcriptions', form, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          ...form.getHeaders(),
        },
        timeout: 60_000,
      });
      const text = (res.data as { text?: string })?.text?.trim() ?? '';
      if (!text) throw new Error('Resposta vazia do Whisper.');
      return text;
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? `OpenAI Whisper ${err.response?.status}: ${JSON.stringify(err.response?.data).slice(0, 200)}`
        : (err as Error).message;
      this.logger.error(`Transcrição falhou: ${msg}`);
      throw new ServiceUnavailableException('Falha ao transcrever áudio. Tente novamente.');
    }
  }
}

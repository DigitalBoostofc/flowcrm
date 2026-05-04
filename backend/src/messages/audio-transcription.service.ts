import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class AudioTranscriptionService {
  private readonly logger = new Logger(AudioTranscriptionService.name);

  constructor(private readonly config: ConfigService) {}

  async transcribe(audioUrl: string): Promise<string> {
    const apiKey = this.config.get<string>('OPENROUTER_API_KEY');
    if (!apiKey) {
      throw new ServiceUnavailableException('Transcrição não configurada (OPENROUTER_API_KEY ausente).');
    }

    // Download audio and convert to base64
    let base64: string;
    let mimeType: string;
    try {
      const resp = await axios.get(audioUrl, { responseType: 'arraybuffer', timeout: 30_000 });
      base64 = Buffer.from(resp.data as ArrayBuffer).toString('base64');
      mimeType = (resp.headers['content-type'] as string | undefined) ?? 'audio/ogg';
      // Normalize to supported format
      if (mimeType.includes('ogg')) mimeType = 'audio/ogg';
      else if (mimeType.includes('mp4') || mimeType.includes('m4a')) mimeType = 'audio/mp4';
      else if (mimeType.includes('wav')) mimeType = 'audio/wav';
      else if (mimeType.includes('mpeg') || mimeType.includes('mp3')) mimeType = 'audio/mp3';
      else mimeType = 'audio/ogg';
    } catch (err) {
      this.logger.error(`Falha ao baixar áudio: ${(err as Error).message}`);
      throw new ServiceUnavailableException('Não foi possível baixar o áudio para transcrição.');
    }

    const model = this.config.get<string>('AI_MODEL_SUMMARY') ?? 'google/gemini-2.5-flash-lite';

    const payload = {
      model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Transcreva o áudio a seguir em português. Retorne apenas o texto transcrito, sem comentários, sem formatação extra.',
            },
            {
              type: 'input_audio',
              input_audio: { data: base64, format: mimeType.split('/')[1] },
            },
          ],
        },
      ],
      max_tokens: 1000,
      temperature: 0,
    };

    try {
      const res = await axios.post('https://openrouter.ai/api/v1/chat/completions', payload, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': this.config.get<string>('FRONTEND_URL') ?? 'https://flowcrm.app',
          'X-Title': 'FlowCRM',
        },
        timeout: 60_000,
      });
      const text = (res.data as any)?.choices?.[0]?.message?.content?.trim() ?? '';
      if (!text) throw new Error('Resposta vazia do modelo.');
      return text;
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? `OpenRouter ${err.response?.status}: ${JSON.stringify(err.response?.data).slice(0, 200)}`
        : (err as Error).message;
      this.logger.error(`Transcrição falhou: ${msg}`);
      throw new ServiceUnavailableException('Falha ao transcrever áudio. Tente novamente.');
    }
  }
}

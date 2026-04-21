import { Logger, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const Stripe = require('stripe');

export const STRIPE_CLIENT = 'STRIPE_CLIENT';

export type StripeClient = any;

export const StripeProvider: Provider = {
  provide: STRIPE_CLIENT,
  useFactory: (config: ConfigService): StripeClient | null => {
    const key = config.get<string>('STRIPE_SECRET_KEY');
    if (!key) {
      new Logger('Stripe').warn('STRIPE_SECRET_KEY não configurada — billing desabilitado');
      return null;
    }
    return new Stripe(key, { apiVersion: '2024-06-20' });
  },
  inject: [ConfigService],
};

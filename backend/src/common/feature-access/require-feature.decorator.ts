import { SetMetadata } from '@nestjs/common';

export const REQUIRED_FEATURE_KEY = 'required_feature';

export const RequireFeature = (feature: string) => SetMetadata(REQUIRED_FEATURE_KEY, feature);

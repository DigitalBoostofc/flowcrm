import { IsEnum, IsObject, IsString } from 'class-validator';

export class CreateChannelDto {
  @IsString()
  name: string;

  @IsEnum(['evolution', 'uazapi', 'meta'])
  type: 'evolution' | 'uazapi' | 'meta';

  @IsObject()
  config: Record<string, string>;
}

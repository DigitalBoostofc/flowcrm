import { IsEnum, IsObject, IsString } from 'class-validator';

export class CreateChannelDto {
  @IsString()
  name: string;

  @IsEnum(['evolution', 'meta'])
  type: 'evolution' | 'meta';

  @IsObject()
  config: Record<string, string>;
}

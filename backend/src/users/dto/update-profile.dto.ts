import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Self-service profile changes.
 * Phone changes go through the dedicated OTP flow (POST /users/me/phone/...) — do not accept
 * `phone` here, since `forgot-password` uses it as the second factor for password reset.
 */
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;
}

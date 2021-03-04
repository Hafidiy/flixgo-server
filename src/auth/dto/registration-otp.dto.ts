import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class RegistrationOtpDto {
  @IsNotEmpty()
  @IsString()
  otp_id: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  @MaxLength(6)
  otp: string;
}

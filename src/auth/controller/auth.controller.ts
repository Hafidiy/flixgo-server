import { Body, Controller, Post, ValidationPipe } from '@nestjs/common';
import { AuthService } from '../service/auth.service';
import { LoginUserDto } from '../dto/login-user.dto';
import { RegistrationOtpDto } from '../dto/registration-otp.dto';
import { RegistrationUserDto } from '../dto/registration-user.dto';
import { userTypes } from '../../users/models/users.enum';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('/signup')
  signUp(
    @Body(ValidationPipe) registrationUserDto: RegistrationUserDto,
  ): Promise<any> {
    return this.authService.signUp(registrationUserDto);
  }

  @Post('/signup-otp')
  signUpOtp(
    @Body(ValidationPipe) registrationOtpDto: RegistrationOtpDto,
  ): Promise<any> {
    return this.authService.signUpOtp(registrationOtpDto);
  }

  @Post('/signin')
  signIn(@Body() loginUserDto: LoginUserDto): Promise<{ access_token; user }> {
    return this.authService.signIn(loginUserDto);
  }
}

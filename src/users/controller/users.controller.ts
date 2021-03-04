import {
  Controller,
  Get,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { User } from '../models/user.entity';
import { UsersService } from '../service/users.service';

@Controller('users')
@UseGuards(AuthGuard())
export class UsersController {
  constructor(private userService: UsersService) {}

  @Get()
  getUsers(@GetUser() user: User) {
    console.log('user: ', user);
    if (user.type !== 'admin') {
      throw new UnauthorizedException();
    }

    return this.userService.getUsers();
  }
}

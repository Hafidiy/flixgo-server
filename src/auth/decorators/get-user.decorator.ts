import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../../users/models/user.entity';

export const GetUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): User =>
    ctx.switchToHttp().getRequest().user,
);

import { FastifyRequest } from 'fastify';
import { AuthenticatedUser } from '../types/auth.type';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

type AuthenticatedRequest = FastifyRequest & { user?: AuthenticatedUser };

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser | undefined => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();

    return request.user;
  },
);

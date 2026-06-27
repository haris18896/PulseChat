import { Socket } from 'socket.io';
import { AuthenticatedUser } from '../../auth/types/auth.type';

export type AuthenticatedSocket = Socket & {
  user?: AuthenticatedUser;
};

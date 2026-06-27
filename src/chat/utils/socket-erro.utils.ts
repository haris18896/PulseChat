import { WsException } from '@nestjs/websockets';

export function socketError(message: string, code = 'BAD_REQUEST') {
  return new WsException({
    message,
    code,
  });
}

import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class JoinConversationDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID('4')
  conversationId: string;
}

import { IsNotEmpty, IsUUID, MaxLength } from 'class-validator';
import { IsString } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID('4')
  conversationId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content: string;
}

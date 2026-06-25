import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class MessageDeliveredDto {
  @IsUUID('4')
  @IsString()
  @IsNotEmpty()
  conversationId: string;

  @IsUUID('4')
  @IsString()
  @IsNotEmpty()
  messageId: string;
}

export class MessageReadDto {
  @IsUUID('4')
  @IsString()
  @IsNotEmpty()
  conversationId: string;
}

export class EditMessageDto {
  @IsUUID('4')
  @IsString()
  @IsNotEmpty()
  messageId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content: string;
}

export class DeleteMessageDto {
  @IsUUID('4')
  @IsString()
  @IsNotEmpty()
  messageId: string;
}

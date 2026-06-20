import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateConversationDto {
  @ApiProperty({
    example: ['user-id-1', 'user-id-2', 'user-id-3'],
    description:
      'User IDs to add to the conversation, These are the users we want to chat with',
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  participantIds: string[];

  @ApiProperty({
    example: 'Project Team',
    description: 'Title of the conversation',
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({
    example: true,
    description: 'Whether the conversation is a group chat',
  })
  @IsBoolean()
  @IsOptional()
  isGroup?: boolean;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class UpdateConversationTitleDto {
  @ApiProperty({
    example: 'Project Team',
    description: 'The new title of the conversation',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title: string;
}

export class AddParticipantDto {
  @ApiProperty({
    example: 'user-id-1',
    description: 'The ID of the user to add to the conversation',
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID('4')
  userId: string;
}

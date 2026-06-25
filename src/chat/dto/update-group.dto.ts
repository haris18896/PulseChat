import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class updateGroupTitleSockerDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID('4')
  conversationId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title: string;
}

export class GroupParticipantSocketDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID('4')
  conversationId: string;

  @IsString()
  @IsNotEmpty()
  @IsUUID('4')
  userId: string;
}

export class LeaveConversationSocketDto {
  @IsUUID('4')
  @IsString()
  @IsNotEmpty()
  conversationId: string;
}

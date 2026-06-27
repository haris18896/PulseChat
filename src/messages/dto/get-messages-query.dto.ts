import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class GetMessagesQueryDto {
  @ApiPropertyOptional({
    example: 20,
    description: 'Number of messages to return',
    default: 20,
  })
  @IsOptional()
  @Type(() => Number) // Query params always arrive as strings, so we need to convert them to numbers
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    example: '59b3dfe-6821-4774-bdc0-a73a90de1ead',
    description: 'Message ID cursor for loading older messages',
  })
  @IsOptional()
  @IsUUID('4')
  cursor?: string;
}

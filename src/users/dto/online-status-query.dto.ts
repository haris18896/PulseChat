import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class OnlineStatusQueryDto {
  @ApiProperty({
    example:
      '5f7ef3ca-9900-4b7e-b95e-07ecc1630645,0b5c401e-980b-4dd0-a194-a5ca0d2e4092',
    description: 'Comma-separated user IDs',
  })
  @IsString()
  @IsNotEmpty()
  userIds: string;
}

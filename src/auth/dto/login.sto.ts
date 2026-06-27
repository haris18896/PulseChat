import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail()
  @ApiProperty({
    example: 'haris@yopmail.com',
    description: 'The email of the user',
    format: 'email',
    type: String,
    required: true,
  })
  email: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: 'Password123!',
    description: 'The password of the user',
    format: 'password',
    type: String,
    required: true,
  })
  password: string;
}

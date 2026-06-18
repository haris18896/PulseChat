import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'The email of the user',
    format: 'email',
    type: String,
    required: true,
  })
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @ApiProperty({
    example: 'Password123!',
    description: 'The password of the user',
    format: 'password',
    type: String,
    required: true,
  })
  password: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @ApiProperty({
    example: 'John Doe',
    description: 'The username of the user',
    format: 'username',
    type: String,
    required: true,
  })
  username: string;
}

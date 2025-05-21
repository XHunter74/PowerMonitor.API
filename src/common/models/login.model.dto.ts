import { IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for user login credentials. Used for authentication endpoints.
 *
 * Contains username and password fields, both required.
 *
 * @example { "username": "admin", "password": "password123" }
 */
export class LoginModelDto {
    @ApiProperty({ example: 'admin', description: 'Username for login' })
    @IsNotEmpty()
    username: string;

    @ApiProperty({ example: 'password123', description: 'Password for login' })
    @IsNotEmpty()
    password: string;
}

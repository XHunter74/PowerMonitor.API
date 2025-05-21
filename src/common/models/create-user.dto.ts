import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for creating a new user. Used for user management endpoints.
 *
 * Contains name, role, and password fields, all required.
 *
 * @example { "name": "John Doe", "role": "admin", "password": "password123" }
 */
export class CreateUserDto {
    @ApiProperty({ example: 'John Doe', description: 'Full name of the user' })
    name: string;

    @ApiProperty({ example: 'admin', description: 'Role of the user (e.g., admin, user)' })
    role: string;

    @ApiProperty({ example: 'password123', description: 'Password for the user' })
    password: string;
}

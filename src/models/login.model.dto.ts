import { IsNotEmpty } from 'class-validator';

export class LoginModelDto {
    @IsNotEmpty()
    username: string;
    @IsNotEmpty()
    password: string;
}

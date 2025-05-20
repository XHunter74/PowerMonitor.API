import { IsNotEmpty } from 'class-validator';

export class FactualDataDto {
    id: number;

    @IsNotEmpty()
    eventDate: Date;

    @IsNotEmpty()
    value: number;
}

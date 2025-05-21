import { IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO representing factual data with event date and value.
 *
 * @example { "id": 1, "eventDate": "2025-05-21T12:00:00Z", "value": 123.45 }
 */
export class FactualDataDto {
    @ApiProperty({ example: 1, description: 'Unique identifier for the factual data record' })
    id: number;

    @ApiProperty({
        example: '2025-05-21T12:00:00Z',
        description: 'Date and time of the event (ISO format)',
    })
    @IsNotEmpty()
    eventDate: Date;

    @ApiProperty({ example: 123.45, description: 'Value associated with the event' })
    @IsNotEmpty()
    value: number;
}

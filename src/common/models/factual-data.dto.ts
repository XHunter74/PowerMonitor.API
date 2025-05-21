import { IsDate, IsDecimal, IsNotEmpty, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * DTO representing factual data with event date and value.
 *
 * @example { "id": 1, "eventDate": "2025-05-21T12:00:00Z", "value": 123.45 }
 */
export class FactualDataDto {
    @ApiProperty({
        example: 1,
        description: 'Unique identifier for the factual data record',
        required: false,
    })
    id?: number;

    @ApiProperty({
        example: '2025-05-21T12:00:00Z',
        description:
            'Date and time of the event (ISO format, must be a valid date in the past or present)',
        type: String,
        format: 'date-time',
    })
    @IsNotEmpty()
    @Type(() => Date)
    @IsDate({ message: 'eventDate must be a valid ISO date string' })
    eventDate: Date;

    @ApiProperty({ example: 123.45, description: 'Value associated with the event' })
    @Type(() => Number)
    @IsDecimal()
    @Min(0)
    value: number;
}

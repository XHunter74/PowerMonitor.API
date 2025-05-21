import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min, Max } from 'class-validator';

/**
 * DTO for specifying a month and year for queries.
 *
 * @example { "month": 5, "year": 2025 }
 */
export class MonthYearDto {
    @ApiProperty({ example: 5, description: 'Month number (1-12)' })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(12)
    month!: number;

    @ApiProperty({ example: 2025, description: 'Year (must be greater than 2018)' })
    @Type(() => Number)
    @IsInt()
    @Min(2019)
    year!: number;
}

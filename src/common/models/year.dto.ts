import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

/**
 * DTO for specifying a year for queries.
 *
 * @example { "year": 2025 }
 */
export class YearDto {
    @ApiProperty({ example: 2025, description: 'Year (must be greater than 2018)' })
    @Type(() => Number)
    @IsInt()
    @Min(2019)
    year!: number;
}

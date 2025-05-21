import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsInt, Min, Max } from 'class-validator';

export class MonthDayOfWeekDto {
    @ApiProperty({ example: 5, description: 'Month number (1-12)' })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(12)
    month!: number;

    @ApiProperty({ name: 'day-of-week', example: 1, description: 'Day of week (0-6, Monday=1)' })
    @Expose({ name: 'day-of-week' })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(7)
    dayOfWeek!: number;
}

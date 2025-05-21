import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * Base Query DTO
 *
 * @example { "year": 2025 }
 */
export class BaseQueryDto {
    @ApiProperty({
        required: false,
        example: 1716268800000,
        description: 'Optional timestamp in milliseconds (date in ms)',
    })
    @Type(() => Number)
    _ts?: number;
}

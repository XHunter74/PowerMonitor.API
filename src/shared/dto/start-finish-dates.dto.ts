import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';
import { BaseQueryDto } from './base-query.dto';

export class StartFinishDatesDto extends BaseQueryDto {
    @ApiProperty({ example: '2020-01-01', description: 'Start date' })
    @Matches(/^\d{4}-\d{1,2}-\d{1,2}$/, {
        message: 'startDate must be in YYYY-M-D or YYYY-MM-DD format',
    })
    startDate!: string;

    @ApiProperty({ example: '2020-01-31', description: 'Finish date' })
    @Matches(/^\d{4}-\d{1,2}-\d{1,2}$/, {
        message: 'finishDate must be in YYYY-M-D or YYYY-MM-DD format',
    })
    finishDate!: string;
}

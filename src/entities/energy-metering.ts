import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';
import { IsNotEmpty } from 'class-validator';
import { ColumnNumericTransformer } from './numeric-column-transformer';

@Entity({ name: 'energy_metering' })
@Index(['year', 'month'], { unique: true })
export class EnergyMetering {
    @PrimaryGeneratedColumn()
    id: number;

    @Index()
    @Column()
    @IsNotEmpty()
    year: number;

    @Column()
    @IsNotEmpty()
    month: number;

    @Column('numeric', {
        precision: 10,
        scale: 1,
        transformer: new ColumnNumericTransformer(),
    })
    @IsNotEmpty()
    start: number;

    @Column('numeric', {
        precision: 10,
        scale: 1,
        transformer: new ColumnNumericTransformer(),
    })
    @IsNotEmpty()
    end: number;

    @Column()
    @IsNotEmpty()
    updated: Date;

    constructor() {
        const currentDate = new Date();
        const today = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            currentDate.getDate(),
        );
        this.year = currentDate.getFullYear();
        this.month = currentDate.getMonth() + 1;
        this.start = 0;
        this.end = 0;
        this.updated = today;
    }
}

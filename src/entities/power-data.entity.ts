import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';
import { IsNotEmpty } from 'class-validator';
import { ColumnNumericTransformer } from './numeric-column-transformer';

@Entity()
@Index(['created', 'hours'], { unique: true })
export class PowerData {
    @PrimaryGeneratedColumn()
    id: number;

    @Index()
    @Column('date')
    @IsNotEmpty()
    created: Date;

    @Column()
    @IsNotEmpty()
    hours: number;

    @Column('numeric', {
        precision: 30,
        scale: 10,
        transformer: new ColumnNumericTransformer(),
    })
    @IsNotEmpty()
    power: number;

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
        this.created = today;
        this.hours = currentDate.getHours();
        this.power = 0;
        this.updated = today;
    }
}

import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    Index,
} from 'typeorm';
import { IsNotEmpty } from 'class-validator';
import { ColumnNumericTransformer } from './numeric-column-transformer';

@Entity({ name: 'power-acc' })
export class PowerAcc {

    @PrimaryGeneratedColumn()
    id: number;

    @Column('numeric', {
        precision: 8,
        scale: 1,
        transformer: new ColumnNumericTransformer(),
    })
    @IsNotEmpty()
    startValue: number;

    @Column('numeric', {
        precision: 10,
        scale: 4,
        transformer: new ColumnNumericTransformer(),
    })
    @IsNotEmpty()
    coefficient: number;

    @Column('numeric', {
        precision: 30,
        scale: 20,
        transformer: new ColumnNumericTransformer(),
    })
    @IsNotEmpty()
    powerAcc: number;

    @Index()
    @Column()
    @IsNotEmpty()
    created: Date;

    @Column()
    @IsNotEmpty()
    updated: Date;

    constructor() {
        const now = new Date();
        this.created = now;
        this.startValue = 0;
        this.powerAcc = 0;
        this.updated = now;
    }
}

import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    Index,
} from 'typeorm';
import { Length, IsNotEmpty } from 'class-validator';
import { ColumnNumericTransformer } from './numeric-column-transformer';

@Entity()
@Index(['created', 'hours'], { unique: true })
export class VoltageAmperageData {

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
        precision: 20,
        scale: 2,
        transformer: new ColumnNumericTransformer(),
    })
    @IsNotEmpty()
    amperageSum: number;

    @Column()
    @IsNotEmpty()
    samples: number;

    @Column('numeric', {
        precision: 20,
        scale: 2,
        transformer: new ColumnNumericTransformer(),
    })
    @IsNotEmpty()
    amperageMin: number;

    @Column('numeric', {
        precision: 20,
        scale: 2,
        transformer: new ColumnNumericTransformer(),
    })
    @IsNotEmpty()
    amperageMax: number;

    @Column('numeric', {
        precision: 20,
        scale: 2,
        transformer: new ColumnNumericTransformer(),
    })
    @IsNotEmpty()
    voltageSum: number;

    @Column('numeric', {
        precision: 20,
        scale: 2,
        transformer: new ColumnNumericTransformer(),
    })
    @IsNotEmpty()
    voltageMin: number;

    @Column('numeric', {
        precision: 20,
        scale: 2,
        transformer: new ColumnNumericTransformer(),
    })
    @IsNotEmpty()
    voltageMax: number;

    @Column()
    @IsNotEmpty()
    updated: Date;

    constructor() {
        const currentDate = new Date();
        const today = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
        this.created = today;
        this.hours = currentDate.getHours();
        this.amperageMax = 0;
        this.amperageMin = 0;
        this.samples = 0;
        this.amperageSum = 0;
        this.voltageMax = 0;
        this.voltageMin = 0;
        this.voltageSum = 0;
    }
}

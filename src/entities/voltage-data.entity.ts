import { IsNotEmpty } from "class-validator";
import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import { ColumnNumericTransformer } from "./numeric-column-transformer";

@Entity()
export class VoltageData {
    @PrimaryGeneratedColumn()
    id: number;

    @Index()
    @Column()
    @IsNotEmpty()
    created: Date;

    @Column('numeric', {
        precision: 20,
        scale: 2,
        transformer: new ColumnNumericTransformer(),
    })
    @IsNotEmpty()
    voltage: number;

    constructor() {
        this.created = new Date();
    }
}
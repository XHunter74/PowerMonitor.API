import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    Index,
} from 'typeorm';
import { IsNotEmpty } from 'class-validator';

@Entity()
export class PowerAvailability {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    @Index()
    @IsNotEmpty()
    created: Date;

    @Column()
    @Index()
    @IsNotEmpty()
    updated: Date;

    constructor() {
        this.created = new Date();
        this.updated = new Date();
    }
}

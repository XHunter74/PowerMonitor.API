import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';
import { IsNotEmpty } from 'class-validator';

@Entity()
export class ServerData {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    @IsNotEmpty()
    created: Date;

    @Column()
    @Index({ unique: true })
    @IsNotEmpty()
    key: string;

    @Column()
    @IsNotEmpty()
    data: string;

    @Column()
    @IsNotEmpty()
    updated: Date;

    constructor() {
        this.created = new Date();
        this.key = '';
        this.data = '';
        this.updated = new Date();
    }
}

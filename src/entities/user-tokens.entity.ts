import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { UserEntity } from './users.entity';

@Entity('tokens')
export class UserTokensEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'timestamp' })
    created: Date;

    @Column('varchar', { length: 1024 })
    token: string;

    @ManyToOne(() => UserEntity, user => user.tokens, { onDelete: 'CASCADE'})
    user: UserEntity;
}

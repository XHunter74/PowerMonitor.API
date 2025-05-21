import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    Unique,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
} from 'typeorm';
import { Length, IsNotEmpty } from 'class-validator';
import * as bcrypt from 'bcrypt';
import { UserTokensEntity } from './user-tokens.entity';

@Entity('user')
@Unique(['username'])
export class UserEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    @Length(4, 20)
    username: string;

    @Column()
    @Length(4, 100)
    password: string;

    @Column()
    @IsNotEmpty()
    role: string;

    @Column()
    @CreateDateColumn()
    createdAt: Date;

    @Column()
    @UpdateDateColumn()
    updatedAt: Date;

    @OneToMany(() => UserTokensEntity, (tokens) => tokens.user, { cascade: true, eager: true })
    tokens: UserTokensEntity[];

    hashPassword() {
        this.password = bcrypt.hashSync(this.password, 8);
    }

    isPasswordValid(password: string) {
        return bcrypt.compareSync(password, this.password);
    }
}

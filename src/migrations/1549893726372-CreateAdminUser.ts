/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { MigrationInterface, QueryRunner, getRepository } from 'typeorm';
import { UserEntity } from '../entities/users.entity';

export class CreateAdminUser1549893726372 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        const userRepository = getRepository(UserEntity);
        let user = await userRepository.findOne({ where: { username: 'admin' } });
        if (!user) {
            user = new UserEntity();
            user.username = 'admin';
            user.password = 'raspberry';
            user.hashPassword();
            user.role = 'ADMIN';
            await userRepository.save(user);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        queryRunner.clearTable('user');
    }
}

import { Entity, Column, PrimaryGeneratedColumn, Index, OneToMany } from 'typeorm';
import * as moment from 'moment';

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    public id: number; // row id

    @Column({
        type: 'int',
        unsigned: true,
    })
    public user: number;

    @Column({
        type: 'varchar',
        length: 255,
    })
    public platform: string;

    @Column({
        type: 'text',
    })
    public access_token: string;

    @Column({
        type: 'text',
    })
    public refresh_token: string;

    @Column({
        type: 'int',
        unsigned: true,
    })
    public created_at: number; // when the user was created

    @Column({
        type: 'int',
        unsigned: true,
    })
    public updated_at: number; // when the user was last updated

    @Column({
        type: 'int',
        unsigned: true,
    })
    public expires_at: number; // when the user was last updated

    @Column({
        type: 'int',
        unsigned: true,
    })
    public deleted_at: number; // timestamp when the user was disabled
}

export default UserPlatform;

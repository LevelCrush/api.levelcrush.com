import { Entity, Column, PrimaryGeneratedColumn, Index, OneToMany } from 'typeorm';
import * as moment from 'moment';
import Application from './application';
import ApplicationUser from './application_user';

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    public id: number; // row id

    @Column({
        type: 'binary',
        length: 32,
        unique: true,
    })
    public token: string; // for public usage, will be a md5 hash

    @Column({
        type: 'binary',
        length: 32,
        unique: true,
    })
    public token_secret: string;

    @Column({
        length: 255,
        unique: true,
    })
    public email: string; // for account linking purposes

    @Column({
        type: 'binary',
        length: 60,
    })
    public password: string; // for backup access purposes

    @Column({
        length: 32,
        unique: true,
    })
    public display_name: string; // preferred display name

    @Column({
        length: 32,
    })
    public display_name_full: string;

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
    public last_login_at: number; // when the user last logged in

    @Column({
        type: 'int',
        unsigned: true,
    })
    public banned_at: number; // timestamp when the user was banned

    @Column({
        type: 'int',
        unsigned: true,
    })
    public deleted_at: number; // timestamp when the user was disabled

    @Column({
        type: 'int',
        unsigned: true,
    })
    public verified_at: number; // timestamp when the user was disabled
}

export default User;

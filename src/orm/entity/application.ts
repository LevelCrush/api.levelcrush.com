import { Entity, Column, PrimaryGeneratedColumn, Index, ManyToOne, JoinTable, JoinColumn, OneToMany } from 'typeorm';
import * as moment from 'moment';
import User from './user';
import ApplicationUser from './application_user';

@Entity()
@Index(['name', 'user'], { unique: true })
export class Application {
    @PrimaryGeneratedColumn()
    public id: number; // row id

    @Column({
        type: 'char',
        length: 32,
        unique: true,
    })
    public token: string; // application token

    @Column({
        type: 'char',
        length: 32,
        unique: true,
    })
    public token_secret: string; // application token + secret

    @Column({
        length: 255,
    })
    public host: string; // url of the application

    @Column({
        length: 255,
    })
    @Index()
    public name: string; // name of the application

    @Column({
        type: 'text',
    })
    public description: string; // description of the string

    @Index()
    @Column({
        type: 'int',
        unsigned: true,
    })
    public user: number; // the person who created this application

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
    public deleted_at: number; // when the user was last updated
}
export default Application;

import { Entity, Column, PrimaryGeneratedColumn, Index, ManyToOne } from 'typeorm';
import User from './user';
import * as moment from 'moment';
import { type } from 'os';

@Entity()
export class Application {
    @PrimaryGeneratedColumn()
    public id: number; // row id

    @Column({
        type: 'binary',
        length: 32,
        unique: true,
    })
    public token: string; // application token

    @Column({
        type: 'binary',
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
        unique: true,
    })
    public name: string; // name of the application

    @Column({
        length: 255,
        unique: true,
    })
    public session_key: string; // key to the session variables

    @Column({
        type: 'text',
    })
    public description: string; // description of the string

    @Column({
        type: 'int',
        unsigned: true,
    })
    @Index()
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
}
export default Application;

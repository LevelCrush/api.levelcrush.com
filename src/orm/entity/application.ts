import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';
import * as moment from 'moment';

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
    })
    public name: string; // name of the application

    @Column({
        length: 255,
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
    public created_at: number; // when the user was created

    @Column({
        type: 'int',
        unsigned: true,
    })
    public updated_at: number; // when the user was last updated
}

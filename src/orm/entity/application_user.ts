import { Entity, Column, PrimaryGeneratedColumn, Index, ManyToOne, OneToOne } from 'typeorm';
import * as moment from 'moment';
import Application from './application';
import User from './user';

@Entity()
@Index(['application', 'user'], { unique: true })
export class ApplicationUser {
    @PrimaryGeneratedColumn()
    public id: number; // row id

    @Column({
        type: 'int',
        unsigned: true,
    })
    @Index()
    public application: number; // the row id of the application

    @Column({
        type: 'int',
        unsigned: true,
    })
    @Index()
    public user: number; // the row id of the user  USING the application

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

export default ApplicationUser;

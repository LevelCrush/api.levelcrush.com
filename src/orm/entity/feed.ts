import { Entity, Column, PrimaryGeneratedColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import * as moment from 'moment';
import ApplicationUser from './application_user';
import Application from './application';
import { application } from 'express';

@Entity()
@Index(['application', 'name'], { unique: true })
export class Feed {
    @PrimaryGeneratedColumn()
    public id: number;

    @Index()
    @Column({
        type: 'int',
        unsigned: true,
    })
    public application: number;

    @Index()
    @Column({
        type: 'varchar',
    })
    public name: string;

    @Column({
        type: 'longtext',
    })
    public data: string;

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

export default Feed;

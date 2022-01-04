import { Entity, Column, PrimaryGeneratedColumn, Index, Binary } from 'typeorm';
import * as moment from 'moment';

@Entity()
@Index(['application', 'user'])
@Index(['application', 'user', 'key'], { unique: true })
export class ApplicationUserMetadata {
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
    public user: number; // the row id of the user

    @Column({
        length: 255,
    })
    @Index()
    public key: string; // for account linking purposes

    @Column({
        length: 255,
    })
    public value: string; // support storing a small data amount here

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

export default ApplicationUserMetadata;

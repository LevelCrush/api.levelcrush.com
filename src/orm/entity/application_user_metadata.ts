import { Entity, Column, PrimaryGeneratedColumn, Index, ManyToOne, JoinColumn } from 'typeorm';

@Entity()
@Index(['application', 'application_user'])
@Index(['application', 'application_user', 'key'], { unique: true })
export class ApplicationUserMetadata {
    @PrimaryGeneratedColumn()
    public id: number; // row id

    @Index()
    @Column({
        type: 'int',
        unsigned: true,
    })
    public application: number; // the row id of the application

    @Index()
    @Column({
        type: 'int',
        unsigned: true,
    })
    public application_user: number; // the row id of the matching user in `application_users`

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

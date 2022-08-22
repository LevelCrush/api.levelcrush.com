import { Entity, Column, PrimaryGeneratedColumn, Index, ManyToOne, OneToOne, JoinColumn, OneToMany } from 'typeorm';

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

    @Index()
    @Column({
        type: 'int',
        unsigned: true,
    })
    public user: number; // the row id of the user  USING the application

    @Column({
        type: 'char',
        length: 32,
    })
    public token: string; // app user specific token;

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

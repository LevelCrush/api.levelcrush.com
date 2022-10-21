import { Entity, Column, PrimaryGeneratedColumn, Index, ManyToOne, JoinColumn } from 'typeorm';

@Entity('lobbies')
@Index(['type', 'name'], { unique: true })
export class Lobby {
    @PrimaryGeneratedColumn()
    public id: number;

    @Index()
    @Column({ type: 'varchar' })
    public type: string;

    @Index()
    @Column({ type: 'varchar' })
    public name: string;

    @Index({ unique: true })
    @Column({ type: 'varchar' })
    public code: string;

    @Column({ type: 'int' })
    public created_at: number;

    @Column({ type: 'int' })
    public updated_at: number;

    @Column({ type: 'int' })
    public deleted_at: number;
}

export default Lobby;

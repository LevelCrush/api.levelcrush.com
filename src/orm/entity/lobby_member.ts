import { Entity, Column, PrimaryGeneratedColumn, Index, ManyToOne, JoinColumn } from 'typeorm';

@Entity('lobby_users')
@Index(['lobby', 'user'], { unique: true })
export class LobbyUser {
    @PrimaryGeneratedColumn()
    public id: number;

    @Index()
    @Column({ type: 'int' })
    public lobby: number;

    @Index()
    @Column({ type: 'int' })
    public user: number;
}

export default LobbyUser;

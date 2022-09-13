import { Entity, Column, PrimaryGeneratedColumn, Index, ManyToOne, JoinColumn } from 'typeorm';

@Entity('leaderboards')
@Index(['type', 'token'], { unique: true })
export class Leaderboard {
    @PrimaryGeneratedColumn()
    public id: number;

    @Index()
    @Column({
        type: 'char',
        length: '32',
    })
    public token: string;

    @Index()
    @Column({
        type: 'varchar',
        length: 50,
    })
    public type: string;

    @Column({
        type: 'int',
    })
    public sortval: number;

    @Column({
        type: 'text',
    })
    public fields: string;
}

export default Leaderboard;

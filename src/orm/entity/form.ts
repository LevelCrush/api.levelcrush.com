import { Entity, Column, PrimaryGeneratedColumn, Index, ManyToOne, JoinColumn } from 'typeorm';

@Entity()
export class Form {
    @PrimaryGeneratedColumn()
    public id: number;

    @Index({ unique: true })
    @Column({
        type: 'varchar',
    })
    public workbook: string;

    @Index()
    @Column({
        type: 'varchar',
    })
    public name: string;

    @Index()
    @Column({
        type: 'varchar',
    })
    public header_range: string;

    @Index()
    @Column({
        type: 'varchar',
    })
    public sheet_name: string;

    @Index()
    @Column({
        type: 'char',
    })
    public token: string;
}

export default Form;

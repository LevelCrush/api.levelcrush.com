import { Column, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity()
@Index(['user', 'platform']) // a user can submit multile of the same platform if they have multiple accounts
@Index(['user', 'platform', 'url'], { unique: true }) // urls are unique, therefore every url should be unique to a user and platform, but they can have different urls on the same platform
export class Creator {
    @Index()
    @PrimaryGeneratedColumn()
    public id: number;

    @Index()
    @Column('int')
    public user: number;

    // what platform does this belong to
    // most will probably be twitch...hopefully
    @Index()
    @Column('int')
    public platform: number;

    // link to the main "creator" url
    @Column('varchar')
    public url: string;

    // intended for a direct embed url or  embed item
    // for twitch this would be the twitch username
    // for youtube it would be the embed link
    @Column('varchar')
    public embed: string;

    // some embeds in the future may require us to store additional data that we cannot
    // store into fields here
    @Column('text')
    public additional: string;

    @Column('int')
    public created_at: number;

    @Column('int')
    public updated_at: number;

    @Column('int')
    public deleted_at: number;
}

export default Creator;

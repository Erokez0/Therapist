import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn, ManyToOne } from 'typeorm';
import { Users } from './Users';
import { Therapists } from './Therapists';
@Entity()
export class Entries {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Therapists)
    @Column({type: "text"})
    therapist: Therapists

    @Column({type: "timestamp"})
    date: Date 

    @OneToOne(() => Users)
    @JoinColumn()
    user: Users

    @Column({type: "boolean", default: false})
    isReminded: boolean
}

import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { Users } from './Users';
import { Therapists } from './Therapists';
@Entity()
export class Entries {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Therapists)
    @JoinColumn()
    therapist: Therapists

    @Column({type: "timestamp without time zone"})
    date: Date 

    @OneToOne(() => Users, {nullable: true})
    @JoinColumn()
    user: Users

    @Column({type: "boolean", default: false})
    isReminded: boolean

}

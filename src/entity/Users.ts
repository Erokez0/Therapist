import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn } from 'typeorm';
import { Group, Stage} from "../types/types"
@Entity()
export class Users {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({type: "text"})
    name: string;

    @Column({type: "text"})
    group: Group;

    @Column({type: "text"})
    telegram: string;

    @Column({type: "text"})
    chatId: number;
}

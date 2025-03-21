import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
@Entity()
export class Therapists {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({type: "text"})
    name: string;

    @Column({type: "text"})
    description: string

    @Column({type: "text"})
    telegram: string;

    @Column({type: "text"})
    chatId: number;
}
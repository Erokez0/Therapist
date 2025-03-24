import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
@Entity()
export class Admins {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({type: "int"})
    chatId: number

}

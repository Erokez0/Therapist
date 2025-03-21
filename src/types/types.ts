import { Therapists } from "entity/Therapists";
import { Users } from "entity/Users";

export type Group = string | number;

export enum Stage {
    start = "start",
    signUp = "signUp",
    therapistChoice = "therapistChoice",
    therapistChosen = "therapistChosen",
    dateChoice = "dateChoice",
    timeChoice = "timeChoice",
    giveName = "giveName", 
    giveGroup = "giveGroup",
    congrats = "congrats",
    reminder = "reminder",
    consent = "consent",
    chosenDateAndTime = "chosenDateAndTime",
    confirmDateAndTime = "confirmDateAndTime"

}
export type userData = {
    name: string,
    group: Group,
    telegram: string,
    chatId: number
}
export type userFindData = {
    id?: number,
    name?: string,
    group?: Group,
    telegram?: string,
    chatId?: number
}
export type userUpdateData = Omit<userFindData, "id">

export type entryData = {
    therapist: Therapists,
    date: Date,
    user: Users
    isReminded: boolean
}

export type entryFindData = {
    id?: number,
    date?: Date,
    user?: Users,
    therapist?: Therapists,
    isReminded?: boolean
}
export type entryUpdateData = Omit<entryFindData, "id">

export type therapistData = {
    name: string,
    description: string,
    telegram: string,
    chatId: number
}
export type therapistFindData = {
    id?: number,
    name?: string,
    telegram?: string,
    chatId?: number
}
export type therapistUpdateData = Omit<therapistFindData, "id">
import { Entries } from "entity/Entries";
import { Therapists } from "entity/Therapists";
import { Users } from "entity/Users";
import { IsNull } from "typeorm";
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
export type userData = Omit<Users, "id">
export type userFindData = Partial<Users>
export type userUpdateData = Omit<userFindData, "id">

export type entryData = Omit<Entries, "id">

export type entryFindData = {
    id?: number,
    therapist?: Therapists,
    user?: Users | null | ReturnType<typeof IsNull>,
    date?: Date,
    isReminded?: boolean
}
export type entryUpdateData = Omit<Partial<Entries>, "id">

export type therapistData = Omit<Therapists, "id">
export type therapistFindData = Partial<Therapists>
export type therapistUpdateData = Omit<therapistFindData, "id">
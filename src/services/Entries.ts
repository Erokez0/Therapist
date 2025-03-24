import { myDataSource } from "data_source/data_source";
import { Entries } from "entity/Entries";
import { skip } from "node:test";
import { entryData, entryFindData, entryUpdateData } from "types/types";

const entriesRepository = myDataSource.getRepository(Entries);
export const entriesServices = {
    async createEntry(entry: entryData): Promise<void> {
        try {
            const foundEntry = await entriesRepository.findOneBy({
                therapist: entry.therapist, 
                date: entry.date, 
                user: entry.user});
            if(foundEntry) throw new Error("Запись уже существует");
            const newEntry = entriesRepository.create({
                therapist: entry.therapist,
                date: entry.date,
                user: entry.user});
            await entriesRepository.save(newEntry);
        } catch (e) {
            throw e;
        }
    },

    async getEntries(): Promise<Entries[]> {
        try {
            const entries = await entriesRepository.find({relations: {user: true, therapist: true}});
            return entries;
        } catch (e) {
           throw e;
        }
    },

    async findEntries(findData: entryFindData, order?: 'asc' | 'desc', limit?: number, skip?: number): Promise<Entries[]> {
        try {
            const foundEntries: Entries[] = await entriesRepository.find(
                {relations: 
                    {user: true, 
                    therapist: true}, 
                where: findData, 
                order: 
                    {date: order},
                take: limit,
                skip: skip
                });
            return foundEntries;
        } catch (e) {
            throw e;
        }
    },
    async findOne(findData: entryFindData): Promise<Entries> {
        try {
            const foundEntry = await entriesRepository.findOneOrFail(
                {where: findData, 
                    relations: {user: true, therapist: true}, 
                    order: {date: "asc"}});
            return foundEntry;
        } catch (e) {
            return null;
        }
    },

    async updateEntry(findData: entryFindData, updateData: entryUpdateData): Promise<void> {
        try {
            const foundEntry = await entriesRepository.findOneBy(findData);
            if(!foundEntry) throw new Error("Записи не существует");
            await entriesRepository.update(findData, updateData);
        } catch (e) {
            throw e;
        }
    },

    async deleteEntry(findData: entryFindData): Promise<void> {
        try {
            const foundEntry = await entriesRepository.findOneBy(findData);
            if(!foundEntry) throw new Error("Записи не существует");
            await entriesRepository.delete(findData);
        } catch (e) {
            throw e;
        }
    }
}
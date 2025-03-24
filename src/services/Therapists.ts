import { myDataSource } from "data_source/data_source";
import { Therapists } from "entity/Therapists";
import { therapistData, therapistFindData, therapistUpdateData } from "types/types";

const therapistsRepository = myDataSource.getRepository(Therapists);

export const therapistsServices = {

    async getTherapists() {
        try {
            const therapists = await therapistsRepository.find();
            return therapists;
        } catch (e) {
            throw e;
        }
    },
    async getTherapistsTelegrams () {
        try {
            const therapists = await therapistsRepository.find({where: {}, select: ["telegram"]});
            return therapists.map(therapist => therapist.telegram);
        } catch (e) {
            throw e;
        }
    },
    async createTherapist(therapist: therapistData): Promise<void> {
        try {
            const newTherapist = therapistsRepository.create({
                name: therapist.name,
                description: therapist.description,
                telegram: therapist.telegram,
                chatId: therapist.chatId
            })
            await therapistsRepository.save(newTherapist);
        } catch (e) {
            throw e;
        }
    },
    async findTherapists(therapistData: therapistFindData): Promise<Therapists[]> {
        try {
            const therapist = await therapistsRepository.findBy(therapistData);
            return therapist;
        } catch (e) {
            throw e;
        }
    },
    async findTherapist(therapistData: therapistFindData): Promise<Therapists> {
        try {
            return await therapistsRepository.findOneByOrFail(therapistData);
        } catch (e) {
            return null;
        }
    },
    async updateTherapist(therapistData: therapistFindData, therapistUpdate: therapistUpdateData): Promise<void> {
        try {
            const foundTherapist: Therapists = (await therapistsServices.findTherapists(therapistData))[0];
            if(!foundTherapist) throw new Error("Не удалось найти психолога");

            await therapistsRepository.update(foundTherapist, therapistUpdate);
        } catch (e) {
            throw e;
        }
    },
    async deleteTherapist(therapistData: therapistFindData): Promise<void> {
        try {
            await therapistsRepository.delete(therapistData);
        } catch (e) {
            throw e;
        }
    },

    async getTherapistsNames(): Promise<string[]> {
        try {
            return (await therapistsServices.getTherapists()).map(therapist => therapist.name);
        } catch (e) {
            throw e;
        }
    },
    async getTherapistByTelegram(telegram: string): Promise<Therapists> {
        try {
            return await therapistsRepository.findOneByOrFail({telegram: telegram});
        } catch (e) {
            return null
        }
    }
}

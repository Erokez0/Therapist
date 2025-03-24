import { myDataSource } from "data_source/data_source";
import { Admins } from "entity/admins";

const adminsRepository = myDataSource.getRepository(Admins);

export const adminsServices = {
    async createAdmin(chatId: number) {
        try {
            await adminsRepository.save({chatId: chatId})
        } catch (e) {
            throw e;
        }
    },
    async findAdmin(chatId: number) {
        try {
            const admin = await adminsRepository.findOneByOrFail({chatId: chatId});
            return admin;
        } catch (e) {
            return null;
        }
    },
    async deleteAdmin(chatId: number) {
        try {
            await adminsRepository.delete({chatId: chatId});
        } catch (e) {
            throw e;
        }
    }
}
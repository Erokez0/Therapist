import { myDataSource } from "data_source/data_source";
import { Users } from "entity/Users";
import { Stage, Group, userData, userFindData, userUpdateData } from "types/types";

const userRepository = myDataSource.getRepository(Users);
export const userServices = {

    async createUser(user: userData): Promise<void> {
        try {
            const sameUser = await userRepository.findOneBy({
                telegram: user.telegram})
            if(sameUser) return;
            const newUser = userRepository.create({
                name: user.name,
                group: user.group,
                telegram: user.telegram,
                chatId: user.chatId
            });
            await userRepository.save(newUser);
        } catch (e) {
            throw e;
        }
    },

    async getUserById(userId: number): Promise<Users> {
        try {
            const user = await userRepository.findOneByOrFail({"id": userId});
            return user;
        } catch (e) {
            throw e;
        }
    },

    async getAllUsers(): Promise<Users[]> {
        try {
            const foundUsers: Users[] = await userRepository.find();
            return foundUsers;
        } catch (e) {
            throw e;
        }
    },

    async findUsers(findData: userFindData): Promise<Users[]> {
        try {
            const foundUsers: Users[] = await userRepository.findBy(findData);
            if(!foundUsers) throw new Error(`Не удалось найти пользователей`)
            return foundUsers;
        } catch (e) {
            throw e;
        }
    },

    async updateUser(findData: userFindData, updateData: userUpdateData): Promise<void> {
        try {
            const foundUser = await userRepository.findOneBy(findData);
            if(!foundUser) throw new Error("Пользователя не существует");
            await userRepository.update(findData, updateData);
        } catch (e) {
            throw e;
        }
    },

    async deleteUser(findData: userFindData): Promise<void> {
        try {
            await userRepository.delete(findData);
        } catch (e) {
            throw e;
        }
    }

}
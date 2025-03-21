import { userServices } from "services/Users";
import { Message } from "node-telegram-bot-api";
import { lib } from "lib/lib";
import {
    Group, 
    Stage, 
    userData 
} from "../types/types"
import { bot } from "../index"

export const usersHandlers = {
    async createUser(message: Message): Promise<void> {
        try {
            if(!lib.isAdmin(message)) return;
            const userParamsArr = message.text.split(" ").splice(1);
            const user: userData = {
                name: userParamsArr[0], 
                group: userParamsArr[1], 
                telegram: userParamsArr[2],
                chatId: +userParamsArr[3]};
            await userServices.createUser(user);
            bot.sendMessage(message.chat.id, `Пользователь успешно создан`);
        } catch (e) {
            bot.sendMessage(message.chat.id, `Не удалось создать пользователя:\n${e.message}`)
        }

    },

    async getAllUsers(message: Message): Promise<void> {
        try {
            if(!lib.isAdmin(message)) return;
            const users = await userServices.getAllUsers();
            bot.sendMessage(message.chat.id, lib.usersToString(users));
        } catch (e) {
            bot.sendMessage(message.chat.id, `Не удалось получить пользователей:\n${e.message}`)
        }
    },

    async getMe(message: Message): Promise<void> {
        try {
            if(!lib.isAdmin(message)) return;
            const telegram: string = message.from.username;
            const foundUser = await userServices.findUsers({telegram: telegram});
            const result = lib.usersToString(foundUser);
            bot.sendMessage(message.chat.id, result)
        } catch (e) {
            bot.sendMessage(message.chat.id, "Не удалось найти пользователя")
        }
    },

    async deleteUser(message: Message): Promise<void> {
        try {
            if(!lib.isAdmin(message)) return;
            const id: string = message.text.split(" ").splice(1)[0];
            await userServices.deleteUser({id: +id});
            bot.sendMessage(message.chat.id, "Пользователь успешно удалён");
        } catch (e) {
            bot.sendMessage(message.chat.id, `Не удалось удалить пользователя:\n${e.message}`)
        }
    },
}
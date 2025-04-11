import { bot } from "index";
import { lib } from "lib/lib";
import { Message } from "node-telegram-bot-api";
import { adminsServices } from "services/Admins";

export async function createDefaultAdmins() {
    try {
        // Паршин Кирилл
        await adminsServices.createAdmin(2139546083);
        // Дмитрий Бикин
        await adminsServices.createAdmin(651309556);
    } catch (e) {
        throw e;
    }
}

export const adminsHandlers = {
    async createAdmin(message: Message): Promise<void> {
        try {
            if (!await lib.isAdmin(message)) return;
            await adminsServices.createAdmin(message.chat.id);
            bot.sendMessage(message.chat.id, "Администратор создан успешно");
        } catch (e) {
            bot.sendMessage(message.chat.id, `Не удалось создать администратора:\n${e.message}`);
        }
    },
    async deleteAdmin(message: Message): Promise<void> {
        try {
            if (!await lib.isAdmin(message)) return;
            await adminsServices.deleteAdmin(message.chat.id);
            bot.sendMessage(message.chat.id, "Администратор удалён успешно");
        } catch (e) {
            bot.sendMessage(message.chat.id, `Не удалось удалить администратора:\n${e.message}`);
        }
    }
}
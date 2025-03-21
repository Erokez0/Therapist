import { Message } from "node-telegram-bot-api";
import { bot } from "../index"
import { lib } from "lib/lib";
import { entriesServices } from "services/Entries";
import { Entries } from "entity/Entries";

export const entriesHandlers = {
    async getEntries(message: Message): Promise<void> {
        try {
            if(!lib.isAdmin(message)) return;
            const entries: Entries[] = await entriesServices.getEntries();
            const entriesString: string = await lib.entriesToString(entries);
            bot.sendMessage(message.chat.id, entriesString);
        } catch (e) {
            bot.sendMessage(message.chat.id, `Не удалось получить записи:\n${e.message}`);
        }
    },
    async deleteEntry(message: Message): Promise<void> {
        try {
            if(!lib.isAdmin(message)) return;
            const entryIds = message.text.split(" ").splice(1);
            for (const entryId of entryIds) {
                if(isNaN(+entryId)) throw new Error("Неправильный id записи");
                await entriesServices.deleteEntry({id: +entryId});
            }
            bot.sendMessage(message.chat.id, "Запись успешно удалена");
        } catch (e) {
            bot.sendMessage(message.chat.id, `Не удалось удалить запись:\n${e.message}`);
        }
    },

    /**
     * Удаляет запись из таблицы, если она находится в прошлом и напоминает всем пользователям о их записях, если запись о ней ещё не напомнили и она находится в промежутке через 24 часа после нынешнего момента времени.
     */
    async remindAndRemovePast(): Promise<void> {
        const day = 86_400_000; // миллисекунды
        const now = new Date();
        for (let ix = 0;; ix++) {
            const entry = (await entriesServices.findEntries(
                {isReminded: false}, 
                "asc", 
                1, 
                ix))[0];
            if (!entry) return;
            if (entry.date < now) {
                entriesServices.deleteEntry({id: entry.id});
            }
            if (entry.date.getTime() <= now.getTime() + day) {
                const user = entry.user;
                const chatId = user.chatId;
                const dayOfWeek = lib.numToWeekday(entry.date.getDay());
                const date = entry.date.getDate() + "." + 
                    entry.date.getMonth() + "." + 
                    entry.date.getFullYear();

                const time = String(entry.date.getHours())
                    .padStart(2, "0") + ":" + 
                    String(entry.date.getMinutes())
                    .padStart(2, "0");

                const therapistName = entry.therapist.name;
                const messageText = `Напоминаем о вашей записи!\n${dayOfWeek} ${date} в ${time} к психологу ${therapistName}.\nОстался один день!`;
                await bot.sendMessage(chatId, messageText);
                await entriesServices.updateEntry(
                    {id: entry.id}, 
                    {isReminded: true});
            }
        }
        
    }
}
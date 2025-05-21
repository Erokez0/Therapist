import { Message } from "node-telegram-bot-api";
import { bot } from "../index"
import { lib } from "lib/lib";
import { entriesServices } from "services/Entries";
import { Entries } from "entity/Entries";
import { therapistsServices } from "services/Therapists";
import { And, IsNull, LessThan, MoreThan, MoreThanOrEqual, Not } from "typeorm";

export const entriesHandlers = {
    /**
     * Создаёт окна (записи) по дате и временам
     * @param message сообщение Telegram с датой и временами
     * @returns 
     */
    async createWindows(message: Message): Promise<void> {
        try {
            if (!lib.isTherapist(message)) return;
            const therapist = (await therapistsServices.findTherapists({ chatId: message.from.id }))[0];
            const paramsArr = message.text.split(/\s/g).splice(1);
            let date: string;
            let formattedDate = paramsArr[0].split(/\D/g).reverse().join("-");
            const times = paramsArr.slice(1);
            try {
                lib.isValidDateString(formattedDate);
            } catch {
                formattedDate = formattedDate.split("-").reverse().join("-");
                lib.isValidDateString(formattedDate);
            }
            date = formattedDate;
            let errors: string[] = [];
            let isSuccesfull = false;
            for (const time of times) {
                try {
                    lib.isValidTime(date, time);
                } catch (e) {
                    errors.push(e.message);
                    continue;
                }
                try {
                    const fullDate = new Date(`${date}T${time}:00.000`);
                    await entriesServices.createEntry(
                        { user: null, therapist: therapist, date: fullDate, isReminded: false }
                    );
                    isSuccesfull = true;
                } catch (e) {
                    errors.push(e.message + ` на ${date} в ${time}`);
                }
            }
            const errorsString = errors.length ? `\nОшибки:\n${errors.join("\n")}` : ""
            const resultMessage = isSuccesfull ? `Успешно созданы окна на ${paramsArr[0]}${errorsString}` : `Не удалось создать окна записи:\n${errors.join("\n")}`
            bot.sendMessage(message.chat.id, resultMessage);
        } catch (e) {
            bot.sendMessage(message.chat.id, `Не удалось создать окна:\n${e.message}`);
        }
    },
    /**
     * Выводит все записи
     * @param message пустое сообщение Telegram
     */
    async getEntries(message: Message): Promise<void> {
        try {
            if (!await lib.isAdmin(message)) return;
            const entries: Entries[] = await entriesServices.findEntries({ user: Not(IsNull()) });
            const entriesString: string = await lib.entriesToString(entries);
            bot.sendMessage(message.chat.id, entriesString);
        } catch (e) {
            bot.sendMessage(message.chat.id, `Не удалось получить записи:\n${e.message}`);
        }
    },
    /**
     * Выводит все окна
     * @param message пустое сообщение Telegram
     */
    async getWindows(message: Message): Promise<void> {
        try {
            if (!await lib.isAdmin(message)) return;
            const entriesString: string = await lib.dateWindowsToString();
            bot.sendMessage(message.chat.id, entriesString, { parse_mode: 'Markdown', disable_web_page_preview: true });
        } catch (e) {
            bot.sendMessage(message.chat.id, `Не удалось получить записи:\n${e.message}`);
        }
    },
    /**
     * Выводит все окна психолога
     * @param message пустое сообщение Telegram
     */
    async getMyWindows(message: Message): Promise<void> {
        try {
            if (!lib.isTherapist(message)) return;
            const entriesString: string = await lib.dateWindowsToStringTg(message.from.username);
            bot.sendMessage(message.chat.id, entriesString, { parse_mode: 'Markdown', disable_web_page_preview: true });
        } catch (e) {
            bot.sendMessage(message.chat.id, `Не удалось получить записи:\n${e.message}`);
        }
    },
    /**
     * Удаляет запись по ID
     * @param message сообщение Telegram, содержащие ID
     * @returns 
     */
    async deleteEntryById(message: Message): Promise<void> {
        try {
            if (!await lib.isAdmin(message)) return;
            const entryId = message.text.split(/\s/g).splice(1)[0];
            if (isNaN(+entryId)) throw new Error('Некорректный id');
            await entriesServices.deleteEntry({ id: +entryId });
            bot.sendMessage(message.chat.id, "Запись успешно удалена");
        } catch (e) {
            bot.sendMessage(message.chat.id, `Не удалось получить записи:\n${e.message}`);
        }
    },
    /**
     * Удаляет окна (записи) на указанную дату или на все указанные времена
     * @param message Сообщение Telegram
     */
    async deleteMyWindows(message: Message): Promise<void> {
        try {
            if (!lib.isTherapist(message)) return;
            const therapist = (await therapistsServices.findTherapists({ telegram: message.from.username }))[0];
            const paramsArr = message.text.split(/\s/g).splice(1);
            let date: string;
            let formattedDate = paramsArr[0].split(/\D/g).reverse().join("-");
            const times = paramsArr.slice(1);

            try {
                lib.isValidDateString(formattedDate);
            } catch {
                formattedDate = formattedDate.split("-").reverse().join("-");
                lib.isValidDateString(formattedDate);
            }
            date = formattedDate;
            let errors: string[] = [];
            let isSuccesful = false;
            const dateTime = new Date(`${date}T00:00:00.000`);
            if (times.length === 0) {
                await entriesServices.deleteEntry({
                    // @ts-expect-error
                    date: And(LessThan(new Date(dateTime.getTime() + 86400000)), MoreThanOrEqual(dateTime)),
                    therapist: therapist
                });
                bot.sendMessage(message.chat.id, `Успешно удалены окна на ${paramsArr[0]}`);
                return;
            }
            for (const time of times) {
                let fullDate;
                try {
                    fullDate = new Date(`${date}T${time}:00.000`);
                } catch {
                    errors.push(`Время ${time} некорректно`);
                    continue;
                }
                try {
                    await entriesServices.deleteEntry(
                        { date: fullDate, therapist: therapist }
                    );
                    isSuccesful = true;
                } catch {
                    errors.push(`Запись на ${date} в ${time} не найдена`);
                }

            }
            const errorsString = errors.length ? `\nОшибки:\n${errors.join("\n")}` : ""
            const resultMessage = isSuccesful ? `Успешно удалены окна на ${paramsArr[0]}${errorsString}` : `Не удалось удалить окна записи:\n${errors.join("\n")}`
            bot.sendMessage(message.chat.id, resultMessage);
        } catch (e) {
            bot.sendMessage(message.chat.id, `Не удалось удалить окна записи:\n${e.message}`);
        }
    },

    /**
     * Удаляет запись из таблицы, если она устарела напоминает всем пользователям о их записях, если запись о ней ещё не напомнили и она находится в промежутке через 24 часа после нынешнего момента времени.
     */
    async remindAndDelete(): Promise<void> {
        const day = 86_400_000; // миллисекунды
        const now = new Date();
        for (let ix = 0; ; ix++) {
            // @ts-expect-error
            const entry = (await entriesServices.findEntries({ date: LessThan(new Date(now.getTime() + day)) }, "asc", 1, ix))[0];

            if (!entry) return;
            if (entry.date <= now) {
                entriesServices.deleteEntry({ id: entry.id });
                continue;
            }
            if (entry.user && !entry.isReminded) {
                const user = entry.user;
                const chatId = user.chatId;
                const dayOfWeek = lib.numToWeekday(entry.date.getDay());
                const stringDate = lib.timeStampToString(entry.date);

                const therapistName = entry.therapist.name;
                const messageText = `Напоминаем о вашей записи!\n${dayOfWeek} ${stringDate.split(" ").join(" в ")} к психологу ${therapistName}.\nОстался один день!`;
                await bot.sendMessage(chatId, messageText);
                await entriesServices.updateEntry(
                    { id: entry.id },
                    { isReminded: true });
            }
        }
    }
}
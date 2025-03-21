import { dateWindows } from "index";
import { Message } from "node-telegram-bot-api";
import { therapistsServices } from "services/Therapists";
import { bot } from "index";
import { lib } from "lib/lib";

export const dateWindowsHandlers = {
    /**
     * @description Принимает сообщение от пользователя, отвечает только психологам.
     * Создает окно записи.
     * 
     * Так же удаляет все некорректные или устаревшие записи.
     * 
     * Формат сообщения
     * @example /createWindows {ДАТА} {ВРЕМЯ} {ВРЕМЯ} ... {ВРЕМЯ}
     * @description ДАТА - дата в формате ГГГГ-ММ-ДД или ММ.ДД.ГГГГ (с любым разделителем)
     * 
     * ВРЕМЯ - время в формате ЧЧ:ММ
     * 
     * Если дата некорректна - не создаёт ничего и выводит сообщение ошибки, если некорректно какое-то из времён, добавляет корректные и выводит все ошибки.
     * @param message сообщение Telegram
     */
    async createDateWindows(message: Message): Promise<void> {
        try {
            if (!(await lib.isTherapist(message))) return;
            lib.deleteInvalidDates();
            const telegram = message.from.username;
            const paramsArr = message.text.split(" ").splice(1);
            let date: string;
            let formattedDate: string = paramsArr[0].replaceAll(/\D/g, "-");
            try {
                lib.isValidDate(formattedDate);
                if (!formattedDate.match(/\d{4}-\d{2}-\d{2}/g)) {
                    throw new Error("Неправильная дата");
                }
                date = formattedDate;
            } catch {
                formattedDate = formattedDate
                    .split(/\D/)
                    .reverse()
                    .join("-");
                lib.isValidDate(formattedDate);
                date = formattedDate;
            }
            const times: string[] = paramsArr.slice(1);
            const sortedTimes = times.toSorted( 
                (a: string, b: string) => {
                for (let i of [0,1,3,4]) {
                    if (a[i] < b[i]) return -1;
                    if (a[i] > b[i]) return 1;
                }
                return 0;
            });
            let timesObject: Record<string, null> = {}
            let errors = [];
            for (const time of sortedTimes) {
                try {
                    lib.isValidTime(date, time);
                    timesObject[time] = null
                } catch (e) {
                    errors.push(e.message.toLowerCase());
                }
            }
            if (Object.keys(timesObject).length) {
                if (!dateWindows[telegram]) {
                    dateWindows[telegram] = {[date]: timesObject};
                } else if (!dateWindows[telegram][date]) {
                    dateWindows[telegram] = Object.assign(dateWindows[telegram] || {}, {[date]: timesObject});
                } else if (!Object.values(dateWindows[telegram][date]).length) {
                    dateWindows[telegram] = Object.assign(dateWindows[telegram][date] || {}, timesObject);
                } else {
                    dateWindows[telegram][date] = Object.assign(dateWindows[telegram][date] || {}, timesObject);
                }
                lib.sortDateWindows();
                bot.sendMessage(message.chat.id, `Успешно созданы окна на ${date}` + (errors.length? `\nОшибки: ${errors.join(', ')}` : ''));
            } else {
                bot.sendMessage(message.chat.id, `Не удалось создать окна на ${date}` + (errors.length? `\nОшибки: ${errors.join(', ')}` : ''));
            }
            lib.deleteInvalidDates();
        } catch (e) {
            bot.sendMessage(message.chat.id, `Не удалось создать окна по дате:\n${e.message}`)
        }
    },
    /** 
     * @summary Удаляет свободные окна записи
     * @description Принимает сообщение от пользователя, отвечает только психологам.
     * 
     * Так же удаляет все некорректные или устаревшие окна.
     * 
     * Формат сообщения:
     * 
     * @example /deleteDateWindows {ДАТА} {ВРЕМЯ} {ВРЕМЯ} ... {ВРЕМЯ}  
     * // Удалит все окна по каждому времени
     * // ИЛИ
     * /deleteDateWindows {ДАТА}
     * //Удалит все окна по дате
     * @description
     * Дата в формате ГГГГ-ММ-ДД или ДД-ММ-ГГГГ, с любым разделителем
     * 
     * Время в формате ЧЧ:ММ
     * 
     * Если одно из времён занято, введено неправильно или не существует, удалит все корректные времена и добавит вывод ошибок по каждому времени
     * @param message сообщение Telegram
     * @returns 
     */
    async deleteDateWindows(message: Message): Promise<void> {
        try {
            const therapistTelegrams = await therapistsServices.getTherapistsTelegrams();
            const telegram = message.from.username;
            if (!therapistTelegrams.includes(telegram)) return;
            lib.deleteInvalidDates();

            const paramsArr = message.text.split(" ").splice(1);
            let date: string;
            let formattedDate: string = paramsArr[0].replaceAll(/\D/g, "-");

            try {
                lib.isValidDate(formattedDate);
                date = formattedDate;
            } catch {
                formattedDate = formattedDate
                    .split(/\D/)
                    .reverse()
                    .join("-");
                lib.isValidDate(formattedDate);
                date = formattedDate;
            }

            const times: string[] = paramsArr.slice(1);
            if (!dateWindows[telegram]) {
                bot.sendMessage(message.chat.id, `У вас нет окон для удаления`);
                return;
            };

            if (!dateWindows[telegram][date]) {
                bot.sendMessage(message.chat.id, `Нет окон для удаления на ${date}`);
                return;
            };

            if(!times.length) {
                if (!Object.values(dateWindows[telegram][date]).length) {
                    delete dateWindows[telegram][date];
                    lib.sortDateWindows();
                    bot.sendMessage(message.chat.id, `Успешно удалены окна на ${date}`);
                } else {
                    bot.sendMessage(message.chat.id, `Нет окон для удаления на ${date}`);
                }

            } else {
                let results: string[] = [];
                let errors: string[] = [];
                for (const time of times) {
                    try {
                        lib.isValidTime(date, time);
                        if (!Object.keys(dateWindows[telegram][date]).includes(time)) {
                            throw new Error(`Нет окна на время ${time}`);
                        }
                        if (typeof dateWindows[telegram][date][time] == "string") {
                            throw new Error(`Время ${time} уже занято`);
                        };
                        delete dateWindows[telegram][date][time];
                        if (!Object.keys(dateWindows[telegram][date]).length) {
                            delete dateWindows[telegram][date];
                            break;
                        }
                        if (!Object.keys(dateWindows[telegram]).length) {
                            delete dateWindows[telegram][date];
                            break;
                        }
                        results.push(time)
                    } catch (e) {
                        errors.push(`e.message`);
                    }
                }
                lib.sortDateWindows();
                bot.sendMessage(message.chat.id, 
                    `Успешно удалены окна на ${date} в ${results.join(',')} ${ errors.length? `\nОшибки: ${errors.join(', ')}` : "" }`);
            }
        } catch (e) {
            bot.sendMessage(message.chat.id, `Не удалось удалить окна по дате:\n${e.message}`)
        }
    },
    /**
     * Получает сообщение, отвечает только админам.
     * 
     * Так же удаляет все некорректные, устаревшие окна.
     * 
     * Выводит в строчном виде все окна записи.
     * 
     * Пример использования:
     * @example /getWindows
     * //Психолог
     * //Кирилл
     * //   Дата
     * //   19.03.2025
     * //       14:00 - Свободно
     * //   Дата
     * //   20.03.2025
     * //       15:00 - Свободно
     * @param message Сообщение Telegram
     */
    async getAllDateWindows(message: Message): Promise<void> {
        try {
            if(!lib.isAdmin(message)) return;
            lib.deleteInvalidDates();
            const messageString = await lib.dateWindowsToString(dateWindows)
            bot.sendMessage(message.chat.id, 
                messageString, 
                {parse_mode: "Markdown"});
            lib.deleteInvalidDates();
        } catch (e) {
            bot.sendMessage(message.chat.id, `Не удалось получить окна записи:\n${e.message}`)
        }
    },
        /**
     * Получает сообщение, отвечает только психологам.
     *
     * Выводит в строчном виде все окна записи, принадлежащие этому психологу
     * 
     * Так же удаляет все некорректные, устаревшие окна.
     * 
     * Пример использования:
     * @example /getMyWindows
     * //Дата
     * //19.03.2025
     * //   13:01 - Свободно
     * //   13:02 - Свободно 
     * @param message Сообщение Telegram
     */
    async getMyDateWindows(message: Message) {
        try {
            if (!lib.isTherapist(message)) return;
            lib.deleteInvalidDates();
            const messageString = lib.dateWindowsToStringTg(dateWindows, message.from.username);
            bot.sendMessage(message.chat.id, 
                messageString, 
                {parse_mode: "Markdown"});
        } catch (e) {
            bot.sendMessage(message.chat.id, `Не удалось получить окна записи:\n${e.message}`)
        }
    }
}
import { Message } from "node-telegram-bot-api";
import dotenv from 'dotenv';
import { bot, userStates } from "../index"
import { lib } from "lib/lib";
import { messages } from "lib/messages";
import {
    entryData,
    Stage,
} from "../types/types"
import { Therapists } from "entity/Therapists";
import { therapistsServices } from "services/Therapists";
import { userServices } from "services/Users";
import { entriesServices } from "services/Entries";
import { parse } from "path";
import { therapistsHandlers } from "./therapists";

dotenv.config()


export const messageHandlers = {

    /**
     * Отменяет действие пользователя, возвращая его на start
     * @param message Сообщение Telegram
     */
    async cancel(message: Message): Promise<void> {
        userStates[message.chat.id] = { "current": Stage.start };
        bot.sendMessage(message.chat.id, messages.cancel,
            {
                reply_markup:
                    { remove_keyboard: true }
            });
    },
    /**
     * Приветственное сообщение пользователю
     * @param message Сообщение Telegram
     */
    async greeting(message: Message): Promise<void> {
        const options = {
            reply_markup: {
                resize_keyboard: true,
                one_time_keyboard: true,
                keyboard: [
                    [{ text: 'Записаться' }],
                ],
            }
        };
        userStates[message.chat.id] = Object.assign(userStates[message.chat.id] || {}, { ["current"]: Stage.start });
        bot.sendMessage(message.chat.id, messages.greeting, options);
    },
    /**
     * Цикл сообщений и ответов для регистрации записи студента к психологу
     * @param message Сообщение Telegram
     */
    async signup(message: Message): Promise<void> {
        const user = await userServices.findUser({ chatId: message.chat.id });
        let currentState;
        if (userStates[message.chat.id]) {
            currentState = userStates[message.chat.id]["current"];
        } else {
            currentState = 'start'
        }
        const entry = (await entriesServices.findEntries({ user: user }))[0];

        if (user && entry) {
            bot.sendMessage(message.chat.id, messages.alreadyRegistered);
            return;
        }
        if (!user && currentState === Stage.start) {
            await bot.sendMessage(message.chat.id, messages.rules, { parse_mode: "Markdown" });
            bot.sendMessage(message.chat.id, messages.notRegisteredName,
                {
                    reply_markup: {
                        resize_keyboard: true,
                        one_time_keyboard: true,
                        keyboard: [
                            [{ text: "Отмена" }],
                        ],
                    }
                }
            )
            userStates[message.chat.id]["current"] = Stage.giveName;
            return;

        } else if (!user && currentState === Stage.giveName) {
            bot.sendMessage(message.chat.id, messages.notRegisteredGroup,
                {
                    reply_markup: {
                        resize_keyboard: true,
                        one_time_keyboard: true,
                        keyboard: [
                            [{ text: "Отмена" }],
                        ],
                    }
                }
            )
            userStates[message.chat.id]["current"] = Stage.giveGroup;
            return;

        } else if (!user) {
            await userServices.createUser({
                name: userStates[message.chat.id][Stage.giveName],
                group: userStates[message.chat.id][Stage.giveGroup],
                telegram: message.from.username || null,
                chatId: message.chat.id,
            });
            userStates[message.chat.id]["current"] = Stage.signUp;
        }

        const therapistsNames: string[] = (await therapistsServices.getTherapists())
            .map((therapist) => therapist.name)

        let keyboard: any[] = []

        therapistsNames.forEach((name) => {
            keyboard.push({ text: name })
        })

        if (!keyboard.length) {
            bot.sendMessage(message.chat.id, "Нет психологов");
            userStates[message.chat.id]["current"] = Stage.start;
            return;
        }

        const options = {
            reply_markup: {
                resize_keyboard: true,
                one_time_keyboard: true,
                keyboard: [
                    keyboard,
                    [{ text: "Отмена" }]
                ],
            }
        };
        bot.sendMessage(message.chat.id, messages.TherapistChoice, options)
    },

    async getTherapistDescription(message: Message, therapistName: string): Promise<void> {
        const options = {
            reply_markup: {
                resize_keyboard: true,
                one_time_keyboard: true,
                keyboard: [
                    [{ text: 'Далее' }, { text: 'Назад' }],
                ],
            }
        }
        const therapist: Therapists = await therapistsServices.findTherapist({ name: therapistName });
        if (!therapist) {
            bot.sendMessage(message.chat.id, "Психолог не найден по имени: " + therapistName);
            return;
        }
        const therapistPhotoExists = await lib.therapistPhotoExists(therapist.chatId);
        const therapistDescription: string = therapist.description || "Нет описания психолога"
        userStates[message.chat.id] = {
            "chosenTherapist": therapist.chatId,
            "current": Stage.dateChoice
        };
        if (therapistDescription.length > 1024) {
            if (therapistPhotoExists) await bot.sendPhoto(message.chat.id, `src/images/${therapist.chatId}.jpg`);
            await bot.sendMessage(message.chat.id, therapistDescription, options);
        } else {
            if (therapistPhotoExists) {
                await bot.sendPhoto(message.chat.id, `src/images/${therapist.chatId}.jpg`, { caption: therapistDescription, ...options });
            } else {
                await bot.sendMessage(message.chat.id, therapistDescription, options);
            }
        }

    },
    async dateChoice(message: Message): Promise<void> {
        const keyboard: any[][] = [];
        const chosenTherapist = userStates[message.chat.id]["chosenTherapist"];
        const freeDates = await lib.getFreeDates(chosenTherapist);
        if (!freeDates.length) {
            bot.sendMessage(message.chat.id, "Нет свободных окон к этому психологу");
            userStates[message.chat.id]["current"] = Stage.therapistChoice;
            delete userStates[message.chat.id]["chosenTherapist"];
            messageHandlers.signup(message);
            return
        }
        let countInBLock = 0;
        let ix = 0;
        for (const date of freeDates) {
            if (countInBLock === 0) {
                keyboard[ix] = [{ text: date }];
                countInBLock++;
            } else if (countInBLock >= 3) {
                ix++;
                countInBLock = 0;
                keyboard[ix] = [{ text: date }];
                countInBLock++;
            } else {
                keyboard[ix].push({ text: date });
                countInBLock++
            }
        }
        keyboard.push([{ text: 'Отмена' }]);
        const options = {
            reply_markup: {
                resize_keyboard: true,
                one_time_keyboard: true,
                keyboard: keyboard,
            }
        };
        bot.sendMessage(message.chat.id, "Выберите дату", options);
        userStates[message.chat.id]["current"] = Stage.timeChoice;
    },

    async timeChoice(message: Message): Promise<void> {
        try {
            const keyboard: any[][] = [];
            const chosenTherapist = userStates[message.chat.id]["chosenTherapist"];
            const therapist = await therapistsServices.findTherapist({ chatId: chosenTherapist });
            const chosenDate = userStates[message.chat.id]["chosenDate"];

            const freeTimes = await lib.getFreeTimes(therapist, chosenDate);

            let countInBLock = 0;
            let ix = 0;
            for (const time of freeTimes) {
                if (countInBLock === 0) {
                    keyboard[ix] = [{ text: time }];
                    countInBLock++;
                } else if (countInBLock >= 3) {
                    ix++;
                    countInBLock = 0;
                    keyboard[ix] = [{ text: time }];
                    countInBLock++;
                } else {
                    keyboard[ix].push({ text: time });
                    countInBLock++
                }
            }
            keyboard.push([{ text: 'Отмена' }]);
            const options = {
                reply_markup: {
                    resize_keyboard: true,
                    one_time_keyboard: true,
                    keyboard: keyboard,
                }
            };
            bot.sendMessage(message.chat.id, `Выберите время`, options);
            userStates[message.chat.id]["current"] = Stage.chosenDateAndTime;
        } catch (e) {
            throw e;
        }
    },
    async confirmDateAndTime(message: Message): Promise<void> {
        message.from.id
        const options = {
            reply_markup: {
                resize_keyboard: true,
                one_time_keyboard: true,
                keyboard: [[{ text: 'Да' }, { text: 'Нет' }]],
            }
        };
        const time = userStates[message.chat.id]["chosenTime"];
        const date = userStates[message.chat.id]["chosenDate"]
            .split(".").reverse().join("-");

        let prettyDate: string[] | string = [];
        for (let piece of date.split("-")) prettyDate.unshift(piece);
        prettyDate = prettyDate.join(".");

        const day = (new Date(date)).getDay();
        const weekday = lib.numToWeekday(day).toLowerCase();

        const chosenTherapistChatId = userStates[message.chat.id]["chosenTherapist"];
        const therapist = await therapistsServices.findTherapist({ chatId: chosenTherapistChatId });
        const messageText = `Вы хотите записаться на ${weekday} ${prettyDate} в ${time} психологу ${therapist.name}, всё верно?`;
        bot.sendMessage(message.chat.id, messageText, options);
    },
    async registerEntry(message: Message): Promise<void> {
        try {
            const chatId = message.chat.id;
            const date = lib.dateAndTimeToDate(userStates[chatId]["chosenDate"],
                userStates[chatId]["chosenTime"]);
            const therapistChatId = userStates[chatId]["chosenTherapist"];
            const therapist = await therapistsServices.findTherapist({ chatId: therapistChatId });
            const user = await userServices.findUser({ chatId: chatId });
            await entriesServices.updateEntry({
                therapist: therapist,
                isReminded: false,
                date: date
            },
                { user: user }
            );
            bot.sendMessage(message.chat.id, messages.registeredSuccesfully, {
                reply_markup: {
                    resize_keyboard: true,
                    one_time_keyboard: true,
                    keyboard: [[{ text: 'Со мной не связались' }]],
                }
            });

            const time = userStates[message.chat.id]["chosenTime"];
            const dateString = userStates[message.chat.id]["chosenDate"];

            let prettyDate: string[] | string = [];
            for (let piece of dateString.split("-")) prettyDate.unshift(piece);
            prettyDate = prettyDate.join(".");

            const day = (new Date(date)).getDay();
            const weekday = lib.numToWeekday(day).toLowerCase();
            const messageText = `К вам записался [${user.name} ${user.group}](tg://user?id=${user.chatId}) на ${weekday} ${prettyDate} в ${time}!`;
            bot.sendMessage(therapist.chatId, messageText, { parse_mode: 'Markdown', disable_web_page_preview: true });
            userStates[chatId] = {
                'current': 'start'
            }
        } catch (e) {
            bot.sendMessage(message.chat.id, `Не удалось создать запись: ${e.message}`);
        }
    },

    async onText(message: Message): Promise<void> {
        const hasCurrentState = userStates[message.chat.id]
            && userStates[message.chat.id]["current"];
        const isCanceled = message.text === "Отмена";
        if (hasCurrentState && !isCanceled) {
            const currentState = userStates[message.chat.id]["current"];
            if (currentState == Stage.giveName) {
                userStates[message.chat.id][Stage.giveName] = message.text
                messageHandlers.signup(message)
                return

            } else if (currentState === Stage.giveGroup) {
                userStates[message.chat.id][Stage.giveGroup] = message.text
                messageHandlers.signup(message)
                return
            } else if (currentState == Stage.dateChoice) {
                if (message.text === "Далее") messageHandlers.dateChoice(message);

            } else if (currentState === Stage.timeChoice) {
                const chosenTherapist = userStates[message.chat.id]["chosenTherapist"];
                const dates = await lib.getFreeDates(chosenTherapist);
                let givenDate = message.text.split(".").reverse().join(".");

                if (!dates.includes(givenDate)) {
                    const transformedDate = givenDate.split(".").reverse().join(".");
                    if (!dates.includes(transformedDate)) {
                        bot.sendMessage(message.chat.id, messages.dateDoesntExist);
                        messageHandlers.dateChoice(message);
                        return
                    }
                    givenDate = transformedDate;

                }
                userStates[message.chat.id]["chosenDate"] = givenDate;
                messageHandlers.timeChoice(message);
            } else if (currentState === Stage.chosenDateAndTime) {
                const chosenDate = userStates[message.chat.id]["chosenDate"];
                const chosenTherapist = userStates[message.chat.id]["chosenTherapist"];
                const therapist = await therapistsServices.findTherapist({ chatId: chosenTherapist });
                const times = await lib.getFreeTimes(therapist, chosenDate);
                const givenTime = message.text;

                if (!times.includes(givenTime)) {
                    bot.sendMessage(message.chat.id, messages.timeDoesntExist);
                    messageHandlers.timeChoice(message);
                    return
                }

                userStates[message.chat.id]["chosenTime"] = givenTime;
                userStates[message.chat.id]["current"] = Stage.confirmDateAndTime;
                messageHandlers.confirmDateAndTime(message);
            } else if (currentState === Stage.confirmDateAndTime) {
                if (message.text === "Да") {
                    messageHandlers.registerEntry(message);
                } else if (message.text === "Нет") {
                    messageHandlers.dateChoice(message);
                } else {
                    const options = {
                        reply_markup:
                        {
                            resize_keyboard: true, one_time_keyboard: true,
                            keyboard: [[{ text: "Да" }, { text: "Нет" }]]
                        }
                    }
                    bot.sendMessage(message.chat.id, "Нет такого варианта, выберите 'Да' или 'Нет", options);
                }
            }
        }
        const therapistsNames = await therapistsServices.getTherapistsNames()
        if (therapistsNames.includes(message.text)) {
            messageHandlers.getTherapistDescription(message, message.text);
        }
    },
    async noContact(message: Message): Promise<void> {
        const user = await userServices.findUser({ chatId: message.chat.id });
        if (!user) return;
        const entry = await entriesServices.findOne({ user: user });
        if (!entry) return;
        const therapist = entry.therapist;
        console.log(entry.user)
        bot.sendMessage(therapist.chatId, `Похоже, что вы не связались с [${user.name} ${user.group}](tg://user?id=${entry.user.chatId})!`, {parse_mode: 'Markdown'});
        bot.sendMessage(message.chat.id, messages.noContact, {parse_mode: 'Markdown'});
    },

    async help(message: Message): Promise<void> {
        const isAdmin = await lib.isAdmin(message);
        const isTherapist = await lib.isTherapist(message);
        if (isTherapist) {
            bot.sendMessage(message.chat.id, messages.helpTherapist, { parse_mode: 'Markdown' });
        };
        if (isAdmin) {
            bot.sendMessage(message.chat.id, messages.helpAdmin, { parse_mode: 'Markdown' });
        };
        if (!isAdmin && !isTherapist) {
            bot.sendMessage(message.chat.id, messages.helpStudent);
        }
    },

    async onPhoto(message: Message): Promise<void> {
        if (message.photo
            && message.caption
            && message.caption.startsWith("/createTherapist")) {
            await therapistsHandlers.createTherapist(message);
        }
    }
}
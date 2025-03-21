import { Message } from "node-telegram-bot-api";
import dotenv from 'dotenv';
import { bot, dateWindows, userStates } from "../index"
import { lib } from "lib/lib";
import { messages } from "lib/messages";
import {
    entryData,
    Group, 
    Stage, 
    userData 
} from "../types/types"
import { Therapists } from "entity/Therapists";
import { therapistsServices } from "services/Therapists";
import { usersHandlers } from "./users";
import { userServices } from "services/Users";
import { time } from "console";
import { entriesServices } from "services/Entries";

dotenv.config()


export const messageHandlers = {

    /**
     * Отменяет действие пользователя, возвращая его на start
     * @param message Сообщение Telegram
     */
    async cancel (message: Message): Promise<void> {
        userStates[message.from.username] = {"current": Stage.start};
        bot.sendMessage(message.chat.id, messages.cancel, 
            {reply_markup: 
                {remove_keyboard: true}});
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
                  [{text: 'Записаться'}],
                ],
            }
        };
        userStates[message.from.username] = Object.assign(userStates[message.from.username] || {}, {["current"]: Stage.start});
        bot.sendMessage(message.chat.id, messages.greeting, options);
    },
    /**
     * Цикл сообщений и ответов для регистрации записи студента к психологу
     * @param message Сообщение Telegram
     */
    async signup(message: Message): Promise<void> {
        const user = (await userServices.findUsers({telegram: message.from.username}))[0];
        let currentState;
        if (userStates[message.from.username]) {
            currentState = userStates[message.from.username]["current"];
        } else {
            currentState = 'start'
        }
        const entry = (await entriesServices.findEntries({user: user}))[0];

        if (user && entry) {
            bot.sendMessage(message.chat.id, messages.alreadyRegistered);
            return;
        }
        if(!user && currentState === Stage.start) {
            await bot.sendMessage(message.chat.id, messages.rules, {parse_mode: "Markdown"});
            bot.sendMessage(message.chat.id, messages.notRegisteredName,
                {
                    reply_markup: {
                        resize_keyboard: true,
                        one_time_keyboard: true,
                        keyboard: [
                            [{text: "Отмена"}],
                        ],
                    }
                }
            )
            userStates[message.from.username]["current"] = Stage.giveName;
            return;

        } else if(!user && currentState === Stage.giveName) {
            bot.sendMessage(message.chat.id, messages.notRegisteredGroup,
                {
                    reply_markup: {
                        resize_keyboard: true,
                        one_time_keyboard: true,
                        keyboard: [
                            [{text: "Отмена"}],
                        ],
                    }
                }
            )
            userStates[message.from.username]["current"] = Stage.giveGroup;
            return;

        } else if(!user) {
            await userServices.createUser({
                name: userStates[message.from.username][Stage.giveName],
                group: userStates[message.from.username][Stage.giveGroup],
                telegram: message.from.username,
                chatId: message.chat.id,
            });
            userStates[message.from.username]["current"] = Stage.signUp;
        }

        const therapistsNames: string[] = (await therapistsServices.getTherapists())
            .map((therapist) => therapist.name)

        let keyboard: any[] = []

        therapistsNames.forEach((name) => {
            keyboard.push({text: name})
        })

        if(!keyboard.length) {
            bot.sendMessage(message.chat.id, "Нет психологов");
            userStates[message.from.username]["current"] = Stage.start;
            return;
        } 

        const options = {
            reply_markup: {
                resize_keyboard: true,
                one_time_keyboard: true,
                keyboard: [
                  keyboard,
                  [{text: "Отмена"}]
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
                  [{text: 'Далее'},{text: 'Назад'}],
                ],
            }
        };
        const therapist: Therapists = (await therapistsServices.findTherapists({name: therapistName}))[0];
        if(!therapist) {
            bot.sendMessage(message.chat.id, "Психолог не найден по имени: " + therapistName);
            return;
        }
        const therapistPhotoExists = await lib.therapistPhotoExists(therapist.telegram);
        if(therapistPhotoExists) {
           await bot.sendPhoto(message.chat.id, `src/images/${therapist.telegram}.jpg`);
        } else {
            await bot.sendMessage(message.chat.id, "У психолога нет фотографии");
        }

        const therapistDescription: string = therapist.description || "Нет описания психолога"
        userStates[message.from.username] = {
            ["chosenTherapist"]: therapist.telegram,
            "current": Stage.dateChoice
        };
        bot.sendMessage(message.chat.id, therapistDescription, options);
    },
    async dateChoice(message: Message): Promise<void> {
        const keyboard: any[][] = [];
        const chosenTherapist = userStates[message.from.username]["chosenTherapist"];
        const freeDates = lib.getFreeDates(chosenTherapist);

        if (!freeDates.length) {
            bot.sendMessage(message.chat.id, "Нет свободных окон к этому психологу");
            userStates[message.from.username]["current"] = Stage.therapistChoice;
            delete userStates[message.from.username]["chosenTherapist"];
            messageHandlers.signup(message);
            return
        }
        let countInBLock = 0;
        let ix = 0;
        for (const date of freeDates) {
            const prettyDate = date.split("-")[2] + "." + date.split("-")[1] + "." + date.split("-")[0];
            if (countInBLock === 0) {
                keyboard[ix] = [{text: prettyDate}];
                countInBLock++;
            } else if (countInBLock >= 3) {
                ix++;
                countInBLock = 0;
                keyboard[ix] = [{text: prettyDate}];
                countInBLock++;
            } else {
                keyboard[ix].push({text: prettyDate});
                countInBLock++
            }
        }
        keyboard.push([{text: 'Отмена'}]);
        const options = {
            reply_markup: {
                resize_keyboard: true,
                one_time_keyboard: true,
                keyboard: keyboard,
            }
        };
        bot.sendMessage(message.chat.id, "Выберите дату", options);
        userStates[message.from.username]["current"] = Stage.timeChoice;
    },

    async timeChoice(message: Message): Promise<void> {
        try {
            const keyboard: any[] = [];
            const chosenTherapist = userStates[message.from.username]["chosenTherapist"];
            const chosenDate = userStates[message.from.username]["chosenDate"];

            const freeTimes = lib.getFreeTimes(chosenTherapist, chosenDate);
            for (const time of freeTimes) {
                keyboard.push({text: time})
            }
            const options = {
                reply_markup: {
                    resize_keyboard: true,
                    one_time_keyboard: true,
                    keyboard: [keyboard, [{text: 'Отмена'}]],
                }
            };
            bot.sendMessage(message.chat.id, `Выберите время`, options);
            userStates[message.from.username]["current"] = Stage.chosenDateAndTime;
        } catch (e) {
            throw e;
        }
    },
    async confirmDateAndTime(message: Message): Promise<void> {
        const options = {
            reply_markup: {
                resize_keyboard: true,
                one_time_keyboard: true,
                keyboard: [[{text: 'Да'},{text: 'Нет'}]],
            }
        };
        const time = userStates[message.from.username]["chosenTime"];
        const date = userStates[message.from.username]["chosenDate"];

        let prettyDate: string[] | string = [];
        for (let piece of date.split("-")) prettyDate.unshift(piece);
        prettyDate = prettyDate.join(".");

        const day = (new Date(date)).getDay();
        const weekday = lib.numToWeekday(day).toLowerCase();

        const chosenTherapistTelegram = userStates[message.from.username]["chosenTherapist"];
        const therapist = (await therapistsServices.findTherapists({telegram: chosenTherapistTelegram}))[0].name;
        const messageText = `Вы хотите записаться на ${weekday} ${prettyDate} в ${time} психологу ${therapist}, всё верно?`;
        bot.sendMessage(message.chat.id, messageText, options);
    },
    async registerEntry(message: Message): Promise<void> {
        try {
            const telegram = message.from.username;

            const date = lib.dateAndTimeToDay(userStates[telegram]["chosenDate"], 
                userStates[telegram]["chosenTime"]);

            const therapistTelegram = userStates[telegram]["chosenTherapist"];
            const therapist = (await therapistsServices.findTherapists({telegram: therapistTelegram}))[0];
            const user = (await userServices.findUsers({telegram: telegram}))[0];
            const entryData: entryData = {
                therapist: therapist,
                date: date,
                user: user,
                isReminded: false
            }

            await entriesServices.createEntry(entryData);
            const options = {
                reply_markup: {
                    resize_keyboard: true,
                    one_time_keyboard: true,
                    keyboard: [[{text: 'Со мной не связались'}]],
                }
            };
            bot.sendMessage(message.chat.id, messages.registeredSuccesfully, options );

            const time = userStates[message.from.username]["chosenTime"];
            const dateString = userStates[message.from.username]["chosenDate"];
            
            dateWindows[therapistTelegram][dateString][time] = message.from.username;

            let prettyDate: string[] | string = [];
            for (let piece of dateString.split("-")) prettyDate.unshift(piece);
            prettyDate = prettyDate.join(".");
    
            const day = (new Date(date)).getDay();
            const weekday = lib.numToWeekday(day).toLowerCase();

            bot.sendMessage(therapist.chatId, `К вам записался ${user.name} ${user.group} @${user.telegram} на ${weekday} ${prettyDate} в ${time}!`);
            userStates[telegram] = {
                'current': 'start'
            }
        } catch (e) {
            bot.sendMessage(message.chat.id, `Не удалось создать запись: ${e}`);
        }
    },

    async onText(message: Message): Promise<void> {
        const hasCurrentState = userStates[message.from.username] 
        && userStates[message.from.username]["current"];
        const isCanceled = message.text === "Отмена";
        if(hasCurrentState && !isCanceled){
            const currentState = userStates[message.from.username]["current"];
            if(currentState == Stage.giveName){
                userStates[message.from.username][Stage.giveName] = message.text
                messageHandlers.signup(message)
                return

            } else if (currentState === Stage.giveGroup) {
                userStates[message.from.username][Stage.giveGroup] = message.text
                messageHandlers.signup(message)
                return
            } else if (currentState == Stage.dateChoice) {
                if (message.text === "Далее") messageHandlers.dateChoice(message);

            } else if (currentState === Stage.timeChoice) {
                const chosenTherapist = userStates[message.from.username]["chosenTherapist"];
                const dates = lib.getFreeDates(chosenTherapist);
                let givenDate = message.text.replaceAll(".", "-");

                if (!dates.includes(givenDate)) {
                    const transformedDate = givenDate.split("-").reverse().join("-");
                    if(!dates.includes(transformedDate)) {
                        bot.sendMessage(message.chat.id, messages.dateDoesntExist);
                        messageHandlers.dateChoice(message);
                        return
                    }
                    givenDate = transformedDate;

                }
                userStates[message.from.username]["chosenDate"] = givenDate;
                messageHandlers.timeChoice(message);
            } else if (currentState === Stage.chosenDateAndTime) {
                const chosenDate = userStates[message.from.username]["chosenDate"];
                const chosenTherapist = userStates[message.from.username]["chosenTherapist"];
                const times = lib.getFreeTimes(chosenTherapist, chosenDate);
                const givenTime = message.text;
            
                if (!times.includes(givenTime)) {
                    bot.sendMessage(message.chat.id, messages.timeDoesntExist);
                    messageHandlers.timeChoice(message);
                    return
                }

                userStates[message.from.username]["chosenTime"] = givenTime;
                userStates[message.from.username]["current"] = Stage.confirmDateAndTime;
                messageHandlers.confirmDateAndTime(message);
            } else if (currentState === Stage.confirmDateAndTime) {
                if (message.text === "Да") {
                    messageHandlers.registerEntry(message);
                } else if (message.text === "Нет") {
                    messageHandlers.dateChoice(message);
                } 
            }
        }
        const therapistsNames = await therapistsServices.getTherapistsNames()
        if(therapistsNames.includes(message.text)) {
            messageHandlers.getTherapistDescription(message, message.text);
        }
    },
    async noContact(message: Message): Promise<void> {
        const user = (await userServices.findUsers({telegram: message.from.username}))[0];
        if (!user) return;
        const entry = (await entriesServices.findEntries({user: user}))[0];
        if (!entry) return;
        const therapist = entry.therapist;
        const userString = `${user.name} ${user.group} @${user.telegram}`
        bot.sendMessage(therapist.chatId, `Похоже, что вы не связались с ${userString}!`);
        bot.sendMessage(message.chat.id, messages.noContact);
    },

    async help(message: Message): Promise<void> {
        const isAdmin = lib.isAdmin(message);
        const isTherapist = await lib.isTherapist(message);
        if (isTherapist) {
            bot.sendMessage(message.chat.id, messages.helpTherapist, {parse_mode: 'Markdown'});
        };
        if (isAdmin) {
            bot.sendMessage(message.chat.id, messages.helpAdmin, {parse_mode: 'Markdown'});
        };
        if (!isAdmin && !isTherapist) {
            bot.sendMessage(message.chat.id, messages.helpStudent);
        }
    }

}
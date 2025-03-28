import "reflect-metadata";
import TelegramBot from "node-telegram-bot-api";
import dotenv from 'dotenv';
import { myDataSource } from "data_source/data_source";
import { usersHandlers } from "handlers/users";
import { messageHandlers } from "handlers/messages"
import { entriesHandlers } from "handlers/entries";
import { therapistsHandlers, defaultTherapists } from "handlers/therapists";
import { lib } from "lib/lib";
import { adminsHandlers, createDefaultAdmins } from "handlers/admins";
dotenv.config();


const TOKEN = process.env.api_token;export const bot = new TelegramBot(TOKEN);
bot.startPolling().then(() => {
    console.log("Bot started!");
}).catch((err) => {
    console.error("Error during bot initialization:", err)
})

myDataSource
    .initialize()
    .then(() => {
        console.log("Data Source has been initialized!");
        defaultTherapists()
            .then(() => {
                console.log("Therapists have been initialized!")
            }).then(() => {
                createDefaultAdmins()
                    .then(() => {
                        console.log("Admins have been initialized!")
                    }).catch((err) => {
                        console.error("Error during admins initialization:", err)
                        bot.stopPolling();
                    })
            }).catch((err) => {
                console.error("Error during therapists initialization:", err)
                bot.stopPolling();
            })
    }).catch((err) => {
        console.error("Error during Data Source initialization:", err)
        bot.stopPolling();
    })

lib.routine();

export let userStates: Record<any, Record<any,  any>> = {};

// КОМАНДЫ

//  ПСИХОЛОГИ
bot.onText(/^\/getTherapists$/g, therapistsHandlers.getTherapists);
bot.onText(/^\/deleteTherapist\s.+$/g, therapistsHandlers.deleteTherapist);
//  ОКНА ЗАПИСИ
bot.onText(
    /^(\/createWindows\s((\d{4}\D\d{2}\D\d{2})|(\d{2}\D\d{2}\D\d{4}))(\s\d{2}:\d{2}){1,})$/g, 
    entriesHandlers.createWindows);
bot.onText(
    /^\/deleteWindows\s((\d{4}\D\d{2}\D\d{2})|(\d{2}\D\d{2}\D\d{4}))(\s\d{2}:\d{2})*$/g, 
    entriesHandlers.deleteMyWindows);
bot.onText(/^\/getWindows$/g, entriesHandlers.getWindows);
bot.onText(/^\/getMyWindows$/g, entriesHandlers.getMyWindows);
// ПОЛЬЗОВАТЕЛИ
bot.onText(/^\/getMe$/g, usersHandlers.getMe);
bot.onText(/^\/createUser\s.+\s.+\s.+$/g, usersHandlers.createUser);
bot.onText(/^\/getUsers$/g, usersHandlers.getAllUsers);
bot.onText(/^\/deleteUser\s\d+$/g, usersHandlers.deleteUser);
// START
bot.onText(/^\/start$/g, messageHandlers.greeting);
// ЗАПИСИ
bot.onText(/^\/getEntries$/, entriesHandlers.getEntries);
bot.onText(/^\/deleteEntry(\s\d+)+$/g, entriesHandlers.deleteEntryById);
bot.onText(/^\/help$/, async msg => {
    await messageHandlers.help(msg);
})
// АДМИНЫ
bot.onText(/^\/createAdmin\s\d+$/g, adminsHandlers.createAdmin);
bot.onText(/^\/deleteAdmin\s\d+$/g, adminsHandlers.deleteAdmin);
// ТЕКСТ
bot.onText(/^Назад$/g, messageHandlers.signup);
bot.onText(/^Записаться$/g, async msg => {
    await messageHandlers.signup(msg);
});
bot.onText(/^(Отмена)|(\/cancel)$/i, messageHandlers.cancel);
bot.onText(/^Со мной не связались$/i, messageHandlers.noContact);
bot.on("text", messageHandlers.onText);
// ФОТО - добавление психолога
bot.on('photo', messageHandlers.onPhoto)
// ОШИБКИ
bot.on('polling_error', (error) => {
    console.error(`Telegram Bot polling error!\n${error.message}`);
    bot.stopPolling();
});
import "reflect-metadata";
import TelegramBot from "node-telegram-bot-api";
import dotenv from 'dotenv';
import { myDataSource } from "data_source/data_source";
import { usersHandlers } from "handlers/users";
import { messageHandlers } from "handlers/messages"
import { entriesHandlers } from "handlers/entries";
import { therapistsHandlers, defaultTherapists } from "handlers/therapists";
import { lib } from "lib/lib";
dotenv.config();


const TOKEN = process.env.api_token;
export const bot = new TelegramBot(TOKEN, {
    polling: true
});

myDataSource
    .initialize()
    .then(() => {
        console.log("Data Source has been initialized!");
        defaultTherapists()
        .then(() => {
            console.log("Therapists have been initialized!")
        }).catch((err) => {
            console.error("Error during therapists initialization:", err)
        })
    })
    .catch((err) => {
        console.error("Error during Data Source initialization:", err)
    })

lib.routine();

export let userStates: Record<any, Record<any,  any>> = {};
/*
{
'2342': {
        chosenTherapist: @ErokezErokez,
        chosenDate: 22.02.2025,
        chosenTime: 14:00,
        fullName: 'Паршин Кирилл Александрович',
        group: 'ИТ11.24.1'
    }
}
*/

// КОМАНДЫ

//  ПСИХОЛОГИ
bot.onText(/^\/getTherapists$/g, async msg => {
    therapistsHandlers.getTherapists(msg);
})
bot.onText(/^\/deleteTherapist\s.+$/g, async msg => {
    therapistsHandlers.deleteTherapist(msg);
})
//  ОКНА ЗАПИСИ
bot.onText(/^(\/createWindows\s((\d{4}\D\d{2}\D\d{2})|(\d{2}\D\d{2}\D\d{4}))(\s\d{2}:\d{2}){1,})$/g, 
    async msg => {
    entriesHandlers.createWindows(msg);
})
bot.onText(/^\/deleteWindows\s((\d{4}\D\d{2}\D\d{2})|(\d{2}\D\d{2}\D\d{4}))(\s\d{2}:\d{2})*$/g, 
    async msg => {
    entriesHandlers.deleteMyWindows(msg);
})
bot.onText(/^\/getWindows$/g, async msg => {
    entriesHandlers.getWindows(msg);
})
bot.onText(/^\/getMyWindows$/g, async msg => {
    entriesHandlers.getMyWindows(msg);
})
// ПОЛЬЗОВАТЕЛИ
bot.onText(/^\/getMe$/g, async msg => {
    usersHandlers.getMe(msg);
});
bot.onText(/^\/createUser\s.+\s.+\s.+$/g, async msg => {
    usersHandlers.createUser(msg)
});
bot.onText(/^\/getUsers$/g, async msg => {
    usersHandlers.getAllUsers(msg);
});
bot.onText(/^\/deleteUser\s\d+$/g, async msg => {
    usersHandlers.deleteUser(msg);
});
// START
bot.onText(/^\/start$/g, async msg => {
    messageHandlers.greeting(msg);
});
// ЗАПИСИ
bot.onText(/^\/getEntries$/, async msg => {
    entriesHandlers.getEntries(msg);
})
bot.onText(/^\/deleteEntry(\s\d+)+$/g, async msg => {
    entriesHandlers.deleteEntryById(msg);
})
bot.onText(/^\/help$/, async msg => {
    messageHandlers.help(msg);
})
// ТЕКСТ
bot.onText(/^Назад$/g, async msg => {
    messageHandlers.signup(msg)
})
bot.onText(/^Записаться$/g, async msg => {
    messageHandlers.signup(msg);
});
bot.onText(/^(Отмена)|(\/cancel)$/i, async msg => {
    messageHandlers.cancel(msg);
});
bot.onText(/^Со мной не связались$/i, async msg => {
    messageHandlers.noContact(msg);
})
bot.on("text", async msg => {
    messageHandlers.onText(msg);
})
bot.on("message",() => console.log(userStates)
)
// ФОТО - добавление психолога
bot.on('photo', async msg => {
    if(msg.photo && msg.caption) {
        if(msg.caption.startsWith("/createTherapist")) {
            therapistsHandlers.createTherapist(msg);
        }
    }
})
// ОШИБКИ
bot.on('polling_error', (error) => {
    console.error(`Telegram Bot polling error!\n${error.message}`);
    bot.stopPolling();
});
bot.on('webhook_error', (error) => {
    console.error(`Telegram Bot webhook error!\n${error.message}`);
});
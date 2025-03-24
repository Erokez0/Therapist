import { Message, User } from "node-telegram-bot-api";
import { bot } from "../index"
import { lib } from "lib/lib";
import { therapistData, } from "../types/types"
import { therapistsServices } from "services/Therapists";
import { messages } from "lib/messages";

export async function defaultTherapists(): Promise<void> {
    try {
        if ((await therapistsServices.getTherapists()).length) return;
        await therapistsServices.createTherapist({
            name: "Алексей",
            description: messages.AlekseyDescription,
            telegram: "AlexPanov95",
            chatId: 292339294
        });
        await therapistsServices.createTherapist({
            name: "Савелий",
            description: messages.SaveliyDescription,
            telegram: "grossoff",
            chatId: 1533228735
        });
    } catch (e) {
        throw e
    }
}


export const therapistsHandlers = {
    async getTherapists(message: Message) {
        try {
            if(!lib.isAdmin(message)) return;
            const therapists = await therapistsServices.getTherapists();
            bot.sendMessage(message.chat.id, lib.therapistsToString(therapists));
        } catch (e) {
            bot.sendMessage(message.chat.id, `Не удалось получить психологов:\n${e.message}`)
        }
    },
    async createTherapist(message: Message) {
        try {
            if(!lib.isAdmin(message)) return;
            let therapistParamsArr = message.caption.split(/\s/g).splice(1);
            const [name, telegram, chatId ] = [therapistParamsArr[0], therapistParamsArr[1], +therapistParamsArr[2]];
            const description  = therapistParamsArr.splice(3).join(" ")
            const therapist: therapistData = {
                name: name,
                description: description,
                telegram: telegram,
                chatId: chatId
            }
            await therapistsServices.createTherapist(therapist);
            const fileId = message.photo[message.photo.length - 1].file_id;
            const fileStream = bot.getFileStream(fileId);
            await lib.addTherapistPhoto(telegram, fileStream)
            bot.sendMessage(message.chat.id, "Психолог создан успешно");
        } catch (e) {
            bot.sendMessage(message.chat.id, `Не удалось создать психолога:\n${e.message}`)
        }
    },
    async deleteTherapist(message: Message) {
        try {
            if(!lib.isAdmin(message)) return;
            let id = +message.text.split(/\s/g).splice(1)[0];
            if(isNaN(id)) throw new Error('Некорректный id');
            await therapistsServices.deleteTherapist({id: id});
            bot.sendMessage(message.chat.id, "Психолог удалён успешно");
        } catch (e) {
            bot.sendMessage(message.chat.id, `Не удалось удалить психолога: \n${e.message}`)
        }
    }
}
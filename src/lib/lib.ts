import { Users } from "entity/Users";
import { Message } from "node-telegram-bot-api";
import { Entries } from "entity/Entries";
import { entriesServices } from "services/Entries";
import { Therapists } from "entity/Therapists";
import { readdir } from "fs/promises";
import path from "path";
import { createWriteStream } from "fs";
import { therapistsServices } from "services/Therapists";
import { entriesHandlers } from "handlers/entries";
import { And, IsNull, LessThan, Like, MoreThan, MoreThanOrEqual } from "typeorm";
import { adminsServices } from "services/Admins";
export const lib = {
    usersToString(users: Users[]): string {
        if(!users.length) return "Нет пользователей";
        let result = "";
        for(let user of users){
            result += `id: ${user.id}\nname: ${user.name}\ngroup: ${user.group}\n`;
            if (user.telegram) {
                result +=`telegram: @${user.telegram}\n\n`;
            } else {
                result += "\n";
            }
        }
        return result;
    },
    async entriesToString(entries: Entries[]): Promise<string> {
        if(!entries.length) return "Нет записей";
        let result = "";
        for(let entry of entries) {
            const user: Users = (await entriesServices.findOne({id: entry.id})).user;
            const therapist = (await therapistsServices.getTherapistByTelegram(entry.therapist.telegram));
            result += `ID: ${entry.id}\nПсихолог: ${therapist.name} @${therapist.telegram}\nДата и время: ${lib.timeStampToString(entry.date)}\nПользователь: ${user.name} ${user.group} `;
            if (user.telegram) {
                result += `@${user.telegram}\n\n`;
            } else {
                result += "\n\n"
            }
        }
        return result;
    },
    isAdmin(message: Message): Boolean {
        return !!adminsServices.findAdmin(message.chat.id);
    },
    isValidDateString(dateString: string): boolean {
        const matchResult = dateString.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/gi);
        return matchResult && matchResult.join() == dateString;
    },
    timeStampToString(timestamp: Date): string {
        const year: number = timestamp.getFullYear();
        const month: number = timestamp.getMonth()+1;
        const day: number = timestamp.getDate();

        const hours: number = timestamp.getHours();
        const minutes: number = timestamp.getMinutes();
        const result: string = `${String(day).padStart(2, "0")}.${String(month).padStart(2, "0")}.${year} ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
        return result
    },
    therapistsToString(therapists: Therapists[]): string {
        if(!therapists.length) throw new Error("Нет психологов");
        let result = "";
        for(let therapist of therapists){
            result += `id: ${therapist.id}\nname: ${therapist.name}\ntelegram: @${therapist.telegram}\n\n`;
        }
        return result;
    },
    async therapistPhotoExists(therapistName: string): Promise<boolean> {
        let fileNames = await readdir(`src/images`);
        return fileNames.includes(therapistName+".jpg")
    },
    async addTherapistPhoto(therapistName: string, readStream: any): Promise<void> {
        try {
            const newFileName = path.join("src", "images", `${therapistName}.jpg`);
            const writeStream = createWriteStream(newFileName);
            readStream.pipe(writeStream);
        } catch (e) {
            throw e;
        }
    },
    async dateWindowsToString(): Promise<string> {
        let result = "***Все окна для записи***\n";
        if (!(await entriesServices.findEntries({}, 'asc', 1, 0))[0]) {
            return "***Нет окон для записи***";
        }
        entriesHandlers.remindAndDelete();
        const therapists  = await therapistsServices.getTherapists();
        for (const therapist of therapists) {
            
            const windows = await entriesServices.findEntries({therapist: therapist}, 'asc');
            if (!windows.length) {
                continue;
            }
            result += `--- ${therapist.name} @${therapist.telegram}\n`;
            let prevDate = ""
            for (const window of windows) {
                const fullDateString = lib.timeStampToString(window.date);
                const stringDate = fullDateString.split(" ")[0];
                const stringTime = fullDateString.split(" ")[1];
                let userString;
                if (!window.user) {
                    userString = "Свободно";
                } else if (window.user.telegram) {
                    userString = `[${window.user.name} ${window.user.group}](https://t.me/${window.user.telegram})`;   
                } else {
                    userString = `${window.user.name} ${window.user.group}`;   
                }
                if (prevDate == stringDate) {
                    result += `\t\t\t- ${stringTime} - ${userString}\n`;
                } else {
                    result += `${stringDate}\n\t\t\t- ${stringTime} - ${userString}\n`;
                }
                prevDate = stringDate;
            }
        }
        return result;
    },
    async dateWindowsToStringTg(telegram: string): Promise<string> {
        let result = "***Ваши окна для записи***\n";
        entriesHandlers.remindAndDelete();
        const therapist = await therapistsServices.getTherapistByTelegram(telegram);
        const windows = await entriesServices.findEntries({therapist: therapist}, 'asc');
        if (!windows.length) {
            return "Похоже, у вас нет окон";
        }
        let prevDate = ""
        for (const window of windows) {
            const fullDateString = lib.timeStampToString(window.date);
            const stringDate = fullDateString.split(" ")[0];
            const stringTime = fullDateString.split(" ")[1];
            let userString;
            if (!window.user) {
                userString = "Свободно";
            } else if (window.user.telegram) {
                userString = `[${window.user.name} ${window.user.group}](https://t.me/${window.user.telegram})`;   
            } else {
                    userString = `${window.user.name} ${window.user.group}`;   
                }
            if (prevDate == stringDate) {
                result += `\t\t\t- ${stringTime} - ${userString}\n`
            } else {
                result += `${stringDate}\n\t\t\t- ${stringTime} - ${userString}\n`
            }
            prevDate = stringDate
        }
        return result;
    },
    /**
     * @param dateString Дата в формате ГГГГ-ММ-ДД или ДД.ММ.ГГГГ
     * @returns true если дата введена правильно и не относится к прошлому, иначе ошибка
     */
    isValidDate(dateString: string): boolean {
        const date = new Date(dateString)
        const isValid = date instanceof Date && isFinite(+date);
        if (!isValid) throw new Error(`Дата "${dateString}" введена неправильно`)
        const now = new Date();
        now.setHours(0,0,0,0);
        const isFuture = date >= now;
        if (!isFuture) throw new Error(`Дата "${dateString}" относится к прошлому`);
        return true
    },
    /**
     * @param dateString Дата в формате ГГГГ-ММ-ДД или ДД.ММ.ГГГГ, должна быть правильной
     * @param timeString Время в формате ЧЧ:ММ
     * @returns true если время введено правильно и не относится к прошлому, иначе ошибка
     */
    isValidTime(dateString: string, timeString: string): boolean {
        const time = new Date(`${dateString}T${timeString}:00.000`);
        const isValid = time instanceof Date && isFinite(+time);
        const currentTime = new Date();
        if(!isValid) throw new Error(`Время "${timeString}" введено неправильно`);
        const isFuture = time.getTime() >= currentTime.getTime();
        if(!isFuture) throw new Error(`Время "${timeString}" относится к прошлому`);
        return true
    },
    async getFreeDates(therapistChatId: number): Promise<string[]> {
        const therapist = await therapistsServices.findTherapist({chatId: therapistChatId});
        const dates = await entriesServices.findEntries(
            {therapist: therapist, 
            user: null, 
            // @ts-expect-error
            date: MoreThan(new Date())},
             'asc');
        if (!dates.length) return [];
        let freeDates: string[] = [];
        for (const date of dates) {
            const dateString = lib.timeStampToString(date.date).split(" ")[0]
            if (!freeDates.includes(dateString)) freeDates.push(dateString);
        }
        return freeDates;
    },
    /**
     * @param therapistTelegram Telegram username психолога
     * @param dateString дата в формате ГГГГ-ММ-ДД или ДД.ММ.ГГГГ
     * @returns массив свободных времен 
     */
    async getFreeTimes(therapist: Therapists, dateString: string): Promise<string[]> {
        const dateTime = new Date(`${dateString.split(".").reverse().join("-")}T00:00:00.000`);
        const dates = await entriesServices.findEntries(
            {therapist: therapist, 
            user: IsNull(), 
            // @ts-expect-error
            date: And(LessThan(new Date(dateTime.getTime()+86400000)), MoreThanOrEqual(dateTime))}, 
            'asc');
        if (!dates.length) return [];
        let freeTimes = [];
        for (const dateObj of dates) {
            let freeTime = lib.timeStampToString(dateObj.date).split(" ")[1];
            freeTimes.push(freeTime);
        }
        return freeTimes;
    },
    numToWeekday(num: number): string {
        const weekdays: Record<number, string> = {
            0: "Воскресенье",
            1: "Понедельник",
            2: "Вторник",
            3: "Среда",
            4: "Четверг",
            5: "Пятница",
            6: "Суббота"
        }
        return weekdays[num];
    },
    dateAndTimeToDate(date: string, time: string): Date {
        const formattedDate = date.split(".").reverse().join("-");
        let result = new Date(`${formattedDate}T${time}:00.000`);
        return result
    },
    async isTherapist(message: Message): Promise<boolean> {
        return !!therapistsServices.findTherapist({chatId: message.chat.id});
    },
    /**
     * Запускает рутиннную функцию напоминаний и удаления неактуальных записей, выполняется каждые 10 минут
     */
    async routine() {
        const interval = 600_000/20; // миллисекунды
        setInterval(
            () => {
                entriesHandlers.remindAndDelete()
            },
            interval
        )
    }
}
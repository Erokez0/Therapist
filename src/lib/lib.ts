import { Users } from "entity/Users";
import { Message } from "node-telegram-bot-api";
import { Entries } from "entity/Entries";
import { entriesServices } from "services/Entries";
import { Therapists } from "entity/Therapists";
import { readdir } from "fs/promises";
import path from "path";
import { createWriteStream } from "fs";
import { dateWindows } from "index";
import { therapistsServices } from "services/Therapists";
import { entriesHandlers } from "handlers/entries";

const adminsTelegrams = process.env.adminsTelegrams.split(" ");

export const lib = {
    usersToString(users: Users[]): string {
        if(!users.length) return "Нет пользователей";
        let result = "";
        for(let user of users){
            result += `id: ${user.id}\nname: ${user.name}\ngroup: ${user.group}\ntelegram: @${user.telegram}\n\n`;
        }
        return result;
    },
    async entriesToString(entries: Entries[]): Promise<string> {
        if(!entries.length) return "Нет записей";
        let result = "";
        for(let entry of entries) {
            const user: Users = (await entriesServices.findEntries({id: entry.id}))[0].user;
            const [name, group, telegram] = [ user.name, user.group, "@"+user.telegram]
            const therapist = (await therapistsServices.getTherapistByTelegram(entry.therapist.telegram));
            result += `ID: ${entry.id}\nПсихолог: ${therapist.name} @${therapist.telegram}\nДата и время: ${lib.timeStampToString(entry.date)}\nПользователь: ${name} ${group} ${telegram}\n\n`;
            console.table(telegram)
        }
        return result;
    },
    isAdmin(message: Message): Boolean {
        return adminsTelegrams.includes(message.chat.username);
    },
    isValidDateString(dateString: string): boolean {
        const matchResult = dateString.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/gi);
        return matchResult && matchResult.join() == dateString;
    },
    timeStampToString(timestamp: Date): string {
        const year: number = timestamp.getFullYear();
        const month: number = timestamp.getMonth();
        const day: number = timestamp.getDate();

        const hours: number = timestamp.getHours();
        const minutes: number = timestamp.getMinutes();
        const result: string = `${String(day).padStart(2, "0")}.${String(month).padStart(2, "0")}.${year} ${hours}:${String(minutes).padStart(2, "0")}`;
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
    async dateWindowsToString(dateWindows: any): Promise<string> {
        if (!Object.keys(dateWindows).length) {
            return "Нет окон для записи!";
        };
        let result = "";
        for (const telegram in dateWindows) {
            const therapist = (await therapistsServices.findTherapists({telegram:telegram}))[0];
            result += `**Психолог**\n${therapist.name}\n`;
            for (const date in dateWindows[telegram]) {
                const prettyDate = date.split('-').reverse().join('.');
                result += `\t\tДата\n\t\t${prettyDate}\n`;
                for (const time in dateWindows[telegram][date]) {
                    const ocupation = dateWindows[telegram][date][time] 
                        ? "@"+dateWindows[telegram][date][time] 
                        : "__Свободно__";
                    result += `\t\t\t\t\t${time} - ${ocupation}\n`;
                }
            }
        }
        return result;
    },
    dateWindowsToStringTg(dateWindows: any, telegram: string): string {

        if (!dateWindows[telegram]) {
            return "У вас нет окон!";
        };
        let result = "";
        for (const date in dateWindows[telegram]) {
            const prettyDate = date.split('-').reverse().join('.');
            result += `Дата\n${prettyDate}\n`;
            for (const time in dateWindows[telegram][date]) {
                const ocupation = dateWindows[telegram][date][time] 
                    ? "@"+dateWindows[telegram][date][time] 
                    : "__Свободно__";
                result += `\t\t\t${time} - ${ocupation}\n`;
            }
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
        const time = new Date(`${dateString}T${timeString}:00.000+03:00`);
        const isValid = time instanceof Date && isFinite(+time);
        const currentTime = new Date();
        if(!isValid) throw new Error(`Время "${timeString}" введено неправильно`);
        const isFuture = time.getTime() >= currentTime.getTime();
        if(!isFuture) throw new Error(`Время "${timeString}" относится к прошлому`);
        return true
    },

    isDateFree(therapistTelegram: string, date: string): boolean {
        const ocupations = Object.values(dateWindows[therapistTelegram][date]);
        return ocupations.some(time => time == null);
    },
    getFreeDates(therapistTelegram: string): string[] {
        if (!dateWindows[therapistTelegram]) return [];
        const dates = Object.keys(dateWindows[therapistTelegram]);
        const freeDates = dates.filter(date => {
            return lib.isDateFree(therapistTelegram, date)
        });
        return freeDates;
    },
    /**
     * @description Удаляет невалидные даты
     */
    deleteInvalidDates() {
        try {
            for (const therapist in dateWindows) {
                if  (!dateWindows[therapist] || Object.entries(dateWindows[therapist]).length == 0) {
                    delete dateWindows[therapist];
                }
                for (const date in dateWindows[therapist]) {
                    if (!dateWindows[therapist][date] || Object.entries(dateWindows[therapist][date]).length == 0) {
                        delete dateWindows[therapist][date];
                    }
                    if  (!dateWindows[therapist] || Object.entries(dateWindows[therapist]).length == 0) {
                        delete dateWindows[therapist];
                    }
                    try {
                        lib.isValidDate(date)
                    } catch {
                        delete dateWindows[therapist][date];
                    }
                    for (const time in dateWindows[therapist][date]) {
                        try {
                            lib.isValidTime(date, time)
                        } catch {
                            delete dateWindows[therapist][date][time];
                            if (!dateWindows[therapist][date] || Object.entries(dateWindows[therapist][date]).length == 0) {
                                delete dateWindows[therapist][date];
                            }
                            if  (!dateWindows[therapist] || Object.entries(dateWindows[therapist]).length == 0) {
                                delete dateWindows[therapist];
                            }
                        }
                    }
                }
            }
        } catch (e) {
            throw e;
        }
    },
    getFreeTimes(therapistTelegram: string, date: string): string[] {
        if(!dateWindows[therapistTelegram]) return [];
        const times = Object.keys(dateWindows[therapistTelegram][date]);
        const freeTimes = times.filter(time => {
            return dateWindows[therapistTelegram][date][time] == null;
        });
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
    dateAndTimeToDay(date: string, time: string): Date {
        let result = new Date(`${date}T${time}:00.000Z`);
        return result
    },
    sortDateWindows() {
        for (let therapist in dateWindows) {
            let datesEntries = Object.entries(dateWindows[therapist]);

            datesEntries.sort((a, b) => {
                const dateA = new Date(a[0]);
                const dateB = new Date(b[0]);
                return dateA.getTime() - dateB.getTime();
            });
            dateWindows[therapist] = Object.fromEntries(datesEntries);
        }
    },
    async isTherapist(message: Message): Promise<boolean> {
        const telegram = message.from.username;
        const therapistTelegrams = await therapistsServices.getTherapistsTelegrams();
        return therapistTelegrams.includes(telegram);
    },
    /**
     * Запускает рутиннную функцию напоминаний и удаления неактуальных записей, выполняется каждые 10 минут
     */
    async routine() {
        const interval = 600_000; // миллисекунды
        setInterval(
            entriesHandlers.remindAndRemovePast,
            interval
        )
    }
}
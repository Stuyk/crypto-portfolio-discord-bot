import { registerCommand } from '../service/commands';
import * as Discord from 'discord.js';
import { getDatabase } from '../utility/database';
import { IPortfolio } from '../interfaces/IPortfolio';
import { COLLECTIONS } from '../enums/collections';
import { removeFromCache } from '../utility/periodicUpdate';

registerCommand({
    name: 'interval',
    command,
    description: '<interval> <m/h/d> - Change your periodic update interval to <interval> minutes hours days or weeks.',
});

async function command(msg: Discord.Message) {
    const db = await getDatabase();

    let data: IPortfolio = await db.fetchData('id', msg.author.id, COLLECTIONS.CRYPTO);
    if (!data) {
        data = await db.insertData({ id: msg.author.id, portfolio: {}, periodic: {} }, COLLECTIONS.CRYPTO, true);
    }
    //User doesn't have a portfolio but a periodic Object. Create a portfolio for him.
    if (!data.portfolio && data.periodic) {
        await db.updatePartialData(data._id, { portfolio: {} }, COLLECTIONS.CRYPTO);

        //Re-Fetch Data so we can access the new objects.
        data = await db.fetchData('id', msg.author.id, COLLECTIONS.CRYPTO);
    }
    //User doesn't have a periodic Object but a portfolio. Create a periodic Object for him.
    if (!data.periodic && data.portfolio) {
        await db.updatePartialData(
            data._id,
            { periodic: { state: false, interval: 60000 * 60 * 3, lastUpdate: null } },
            COLLECTIONS.CRYPTO
        );

        //Re-Fetch Data so we can access the new objects.
        data = await db.fetchData('id', msg.author.id, COLLECTIONS.CRYPTO);
    }
    //User doesn't have either but has some other data stored. Create both for him.
    if (data && !data.periodic && !data.portfolio) {
        await db.updatePartialData(
            data._id,
            { periodic: { state: false, interval: 60000 * 60 * 3, lastUpdate: null } },
            COLLECTIONS.CRYPTO
        ); //Create Empty Portfolio
        await db.updatePartialData(data._id, { portfolio: {} }, COLLECTIONS.CRYPTO); //Create Empty Periodic Object

        //Re-Fetch Data so we can access the new objects.
        data = await db.fetchData('id', msg.author.id, COLLECTIONS.CRYPTO);
    }

    const interval = parseInt(msg.content.split(' ')[1]); // Get interval
    const type = msg.content.split(' ')[2]; //Get type of interval

    switch (type) {
        case 'm':
            await msg.reply(`Switched interval to ${interval} minutes`);
            await msg.delete();
            await db.updatePartialData(
                data._id,
                { periodic: { ...data.periodic, interval: interval * 60000 } },
                COLLECTIONS.CRYPTO
            );
            break;
        case 'h':
            await msg.reply(`Switched interval to ${interval} hours`);
            await db.updatePartialData(
                data._id,
                { periodic: { ...data.periodic, interval: interval * 60000 * 60 } },
                COLLECTIONS.CRYPTO
            );
            await msg.delete();
            break;
        case 'd':
            await msg.reply(`Switched interval to ${interval} days`);
            await db.updatePartialData(
                data._id,
                { periodic: { ...data.periodic, interval: interval * 60000 * 60 * 24 } },
                COLLECTIONS.CRYPTO
            );
            await msg.delete();
            break;
        case 'w':
            await msg.reply(`Switched interval to ${interval} weeks`);
            await db.updatePartialData(
                data._id,
                { periodic: { ...data.periodic, interval: interval * 60000 * 60 * 24 * 7 } },
                COLLECTIONS.CRYPTO
            );
            await msg.delete();
            break;
        default:
            await msg.reply("Sorry that didn't work");
            await msg.reply(`${interval} ${type}`);
            await msg.delete();
    }
}

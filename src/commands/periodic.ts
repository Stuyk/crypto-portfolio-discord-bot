import * as Discord from 'discord.js';
import {COLLECTIONS} from '../enums/collections';
import {IPortfolio} from '../interfaces/IPortfolio';
import {getDatabase} from '../utility/database';
import {registerCommand} from '../service/commands';
import {removeFromCache} from '../utility/periodicUpdate';

registerCommand({name: 'periodic', command, description: 'Turn on periodic updates. Currently every 8 hours.'});

async function command(msg: Discord.Message) {
    const db = await getDatabase();

    let data: IPortfolio = await db.fetchData('id', msg.author.id, COLLECTIONS.CRYPTO);
    if (!data) {
        data = await db.insertData({id: msg.author.id, portfolio: {}, periodic: {}}, COLLECTIONS.CRYPTO, true);
    }
    //User doesn't have a portfolio but a periodic Object. Create a portfolio for him.
    if (!data.portfolio && data.periodic) {
        await db.updatePartialData(data._id, {portfolio: {}}, COLLECTIONS.CRYPTO);

        //Re-Fetch Data so we can access the new objects.
        data = await db.fetchData('id', msg.author.id, COLLECTIONS.CRYPTO);
    }
    //User doesn't have a periodic Object but a portfolio. Create a periodic Object for him.
    if (!data.periodic && data.portfolio) {
        await db.updatePartialData(data._id, {periodic: {}}, COLLECTIONS.CRYPTO);

        //Re-Fetch Data so we can access the new objects.
        data = await db.fetchData('id', msg.author.id, COLLECTIONS.CRYPTO);
    }
    //User doesn't have either but has some other data stored. Create both for him.
    if (data && !data.periodic && !data.portfolio) {
        await db.updatePartialData(data._id, {periodic: {}}, COLLECTIONS.CRYPTO); //Create Empty Portfolio
        await db.updatePartialData(data._id, {portfolio: {}}, COLLECTIONS.CRYPTO); //Create Empty Periodic Object

        //Re-Fetch Data so we can access the new objects.
        data = await db.fetchData('id', msg.author.id, COLLECTIONS.CRYPTO);
    }

    data.periodic.state = !data.periodic.state;
    await db.updatePartialData(data._id, {periodic: data.periodic}, COLLECTIONS.CRYPTO);
    msg.reply(`Enable Periodic Updates: ${data.periodic.state}`);
    msg.delete();

    if (!data.periodic) {
        removeFromCache(msg.author.id);
    }
}

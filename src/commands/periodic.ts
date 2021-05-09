import * as Discord from 'discord.js';
import { COLLECTIONS } from '../enums/collections';
import { IPortfolio } from '../interfaces/IPortfolio';
import { getDatabase } from '../utility/database';
import { registerCommand } from '../service/commands';
import { removeFromCache } from '../utility/periodicUpdate';

registerCommand({ name: 'periodic', command, description: 'Turn on periodic updates. Currently every 8 hours.' });

async function command(msg: Discord.Message) {
    const db = await getDatabase();

    let data: IPortfolio = await db.fetchData('id', msg.author.id, COLLECTIONS.CRYPTO);
    if (!data) {
        data = await db.insertData({ id: msg.author.id, portfolio: {} }, COLLECTIONS.CRYPTO, true);
    }

    data.periodic = !data.periodic ? true : false;
    await db.updatePartialData(data._id, { periodic: data.periodic }, COLLECTIONS.CRYPTO);
    msg.reply(`Enable Periodic Updates: ${data.periodic}`);
    msg.delete();

    if (!data.periodic) {
        removeFromCache(msg.author.id);
    }
}

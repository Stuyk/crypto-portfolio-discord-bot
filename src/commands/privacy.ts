import * as Discord from 'discord.js';
import { registerCommand } from '../service/commands';
import { COLLECTIONS } from '../enums/collections';
import { IPortfolio } from '../interfaces/IPortfolio';
import { getDatabase } from '../utility/database';

registerCommand({ name: 'privacy', command, description: 'Toggle Privacy' });

async function command(msg: Discord.Message) {
    const db = await getDatabase();

    let data: IPortfolio = await db.fetchData('id', msg.author.id, COLLECTIONS.CRYPTO);
    if (!data) {
        data = await db.insertData({ id: msg.author.id, portfolio: {} }, COLLECTIONS.CRYPTO, true);
    }

    data.privacy = !data.privacy ? true : false;
    await db.updatePartialData(data._id, { privacy: data.privacy }, COLLECTIONS.CRYPTO);
    msg.reply(`Enable Privacy: ${data.privacy}`);
    msg.delete();
}

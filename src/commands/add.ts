import * as Discord from 'discord.js';
import { getTicker } from '../utility/fetch';

import { COLLECTIONS } from '../enums/collections';
import { IPortfolio } from '../interfaces/IPortfolio';
import { registerCommand } from '../service/commands';
import { getDatabase } from '../utility/database';

registerCommand({ name: 'add', command, description: '<ticker> <amount> - Add to your portfolio.' });

async function command(msg: Discord.Message, ticker: string, amount: any) {
    const db = await getDatabase();

    if (!ticker) {
        msg.reply('Must supply a ticker.');
        return;
    }

    ticker = ticker.toLowerCase();
    const isTicker = await getTicker(ticker);
    if (!isTicker) {
        msg.reply(`$${ticker} is not a valid ticker.`);
        return;
    }

    amount = parseFloat(amount);

    if (!amount || amount <= 0) {
        msg.reply(`Must use a positive value.`);
        return;
    }

    if (amount > Number.MAX_SAFE_INTEGER - 500000) {
        msg.reply(`Number is too large.`);
        return;
    }

    let data: IPortfolio = await db.fetchData('id', msg.author.id, COLLECTIONS.CRYPTO);
    if (!data) {
        data = await db.insertData({ id: msg.author.id, portfolio: {} }, COLLECTIONS.CRYPTO, true);
    }

    if (!data.portfolio[ticker]) {
        data.portfolio[ticker] = 0;
    }

    data.portfolio[ticker] += amount;
    await db.updatePartialData(data._id, { portfolio: data.portfolio }, COLLECTIONS.CRYPTO);

    if (data.privacy) {
        msg.author.send(`Added ${amount} to $${ticker.toUpperCase()} to your portfolio.`).catch((err) => {
            msg.reply(`Could not send you a private message. Open your DMs nerd.`);
        });
    } else {
        msg.reply(`Added ${amount} $${ticker.toUpperCase()} to your portfolio.`);
    }

    msg.delete();
}

import * as Discord from 'discord.js';
import { registerCommand } from '../service/commands';
import { COLLECTIONS } from '../enums/collections';
import { IPortfolio } from '../interfaces/IPortfolio';
import { getDatabase } from '../utility/database';

registerCommand({
    name: 'remove',
    command,
    description: '<ticker> <amount> - Remove a token amount from your portfolio.',
});

async function command(msg: Discord.Message, ticker: string, amount: any) {
    const db = await getDatabase();

    if (!ticker) {
        msg.reply('Must supply a ticker.');
        return;
    }

    ticker = ticker.toLowerCase();
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
        msg.reply(`That token is not in your portfolio.`);
        return;
    }

    data.portfolio[ticker] -= amount;

    if (data.portfolio[ticker] <= 0) {
        delete data.portfolio[ticker];
    }

    await db.updatePartialData(data._id, { portfolio: data.portfolio }, COLLECTIONS.CRYPTO);
    if (data.privacy) {
        msg.author.send(`Removed ${amount} for $${ticker.toUpperCase()} from your portfolio.`).catch((err) => {
            msg.reply(`Could not send you a private message. Open your DMs nerd.`);
        });
    } else {
        msg.reply(`Removed ${amount} $${ticker.toUpperCase()} from your portfolio.`);
    }

    msg.delete();
}

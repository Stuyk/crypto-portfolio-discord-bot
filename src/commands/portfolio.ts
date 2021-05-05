import * as Discord from 'discord.js';
import { COLLECTIONS } from '../enums/collections';
import { IPortfolio, IPortfolioFull } from '../interfaces/IPortfolio';
import { getDatabase } from '../utility/database';
import { getPortfolioStats, updatePortfolio } from '../utility/algorithms';
import AsciiTable from 'ascii-table';
import { registerCommand } from '../service/commands';

export async function periodicPortfolio(member: Discord.User) {
    const db = await getDatabase();

    let data: IPortfolio = await db.fetchData('id', member.id, COLLECTIONS.CRYPTO);
    if (!data) {
        data = await db.insertData({ id: member.id, portfolio: {} }, COLLECTIONS.CRYPTO, true);
    }

    member.send(`Hi, here is your periodic update.`);

    const descriptions = await portfolioHandler(data, true);
    for (let i = 0; i < descriptions.length; i++) {
        member.send(descriptions[i]);
    }
}

async function command(msg: Discord.Message, isLarge: boolean = false) {
    const db = await getDatabase();

    let data: IPortfolio = await db.fetchData('id', msg.author.id, COLLECTIONS.CRYPTO);
    if (!data) {
        data = await db.insertData({ id: msg.author.id, portfolio: {} }, COLLECTIONS.CRYPTO, true);
    }

    if (!data.portfolio || Object.keys(data.portfolio).length <= 0) {
        msg.reply(`You do not have a portfolio.`);
        return;
    }

    const descriptions = await portfolioHandler(data, isLarge);

    for (let i = 0; i < descriptions.length; i++) {
        if (data.privacy) {
            msg.author.send(descriptions[i]).catch((err) => {
                msg.reply('Open your DMs if you run this in privacy mode.');
            });
        } else {
            msg.reply(descriptions[i]);
        }
    }
}

async function portfolioHandler(data: IPortfolio, isLarge: boolean = false): Promise<Array<string>> {
    const db = await getDatabase();

    if (!data.history) {
        data.history = {};
    }

    console.log(`[BOT] Getting Portfolio for ${data._id}`);

    const stats: IPortfolioFull = await getPortfolioStats(data);
    const descriptions: Array<string> = [];
    let portfolioTable = new AsciiTable('');
    let newTable = true;
    let noHeading = false;
    let description = '```';
    let count = 0;

    for (let i = 0; i < stats.portfolio.length; i++) {
        // Create the Table Style
        if (newTable) {
            newTable = false;

            if (!noHeading) {
                if (isLarge) {
                    portfolioTable.setHeading('$', `AMOUNT`, `TOTAL`, `COIN`, `+/-`);
                } else {
                    portfolioTable.setHeading('$', `AMOUNT`, `TOTAL`);
                }
            }

            portfolioTable.setHeadingAlign(AsciiTable.RIGHT);
        }

        const coin = stats.portfolio[i];
        const fixedAmount = coin.amount.toLocaleString();
        const fixedValue = parseFloat(coin.value.toFixed(2)).toLocaleString();
        const fixedDiff = parseFloat(coin.diff.toFixed(2)).toLocaleString();

        if (isLarge) {
            portfolioTable.addRow(
                coin.ticker.toUpperCase(),
                fixedAmount,
                `$${fixedValue}`,
                `$${coin.price}`,
                `${fixedDiff}`
            );
        } else {
            portfolioTable.addRow(coin.ticker.toUpperCase(), fixedAmount, `$${fixedValue}`);
        }

        portfolioTable.setAlign(i, AsciiTable.RIGHT);
        count += 1;

        // Determine if we need to send this early.
        // Helps with scaling the portfolio when it's too big.
        if (count <= 18 && i !== stats.portfolio.length - 1) {
            continue;
        }

        // Send It!
        count = 0;
        newTable = true;
        noHeading = true;

        description += portfolioTable.toString();
        description += '```';

        descriptions.push(description);
        description = '```'; // Reset the description.

        portfolioTable = new AsciiTable('');
    }

    const totalsTable = new AsciiTable();
    totalsTable.setHeading(`TOTAL`, `DIFF ($)`);
    totalsTable.setHeadingAlign(AsciiTable.RIGHT);
    totalsTable.addRow(`$${parseFloat(stats.total.toFixed(2)).toLocaleString()}`, `${stats.diff.toFixed(2)}`);

    description += totalsTable.toString();
    description += '```';
    descriptions.push(description);

    const newData = updatePortfolio(data, stats.portfolio);
    await db.updatePartialData(data._id, { history: newData.history }, COLLECTIONS.CRYPTO);

    console.log(`[BOT] Finished Portfolio Update for ${data._id}`);

    return descriptions;
}

registerCommand({ name: 'portfolio', command, description: '<?isLarge> - Print your portfolio.' });

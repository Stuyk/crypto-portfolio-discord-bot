import * as Discord from 'discord.js';

import { registerCommand } from '../service/commands';
import { getTicker } from '../utility/fetch';

registerCommand({ name: 'price', command, description: '<ticker>' });

async function command(msg: Discord.Message, ticker: string) {
    if (!ticker) {
        msg.reply(`!price <ticker>`);
        return;
    }

    const embed = new Discord.MessageEmbed();
    embed.title = `$${ticker.toUpperCase()}`;
    embed.setThumbnail(`https://i.imgur.com/GOZuKMH.gif`);
    embed.setDescription('Please wait while I fetch this price...');

    const newMessage = await msg.reply(embed);
    const currentPrice = await getTicker(ticker);
    if (!currentPrice) {
        embed.setDescription('Could not track this token.');
        embed.setThumbnail('');
        newMessage.edit(embed);
        return;
    }

    embed.title = `$${ticker.toUpperCase()} - ${currentPrice.name}`;
    embed.setDescription('');
    embed.setThumbnail(currentPrice.icon);
    embed.setColor(currentPrice.price_24 <= 0 ? 'RED' : 'GREEN');
    embed.addField('Current Price', `$${currentPrice.usd}`);
    embed.addField('Percentage Change (24h)', `${currentPrice.price_24_percentage}%`);
    embed.addField('Price Change (24h)', `${currentPrice.price_24}`);
    newMessage.edit(embed);
}

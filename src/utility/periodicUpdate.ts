import * as Discord from 'discord.js';
import { getDiscordUser } from '../index';
import { COLLECTIONS } from '../enums/collections';
import { IPortfolio } from '../interfaces/IPortfolio';
import { getDatabase } from '../utility/database';
import { periodicPortfolio } from '../commands/portfolio';

const TimeBetweenUpdates = 60000 * 3;
let cachedMembers: Array<Discord.User> = [];
let nextUpdate: number;

export async function removeFromCache(id: string) {
    const index = cachedMembers.findIndex((x) => x.id === id);

    if (index <= -1) {
        return;
    }

    cachedMembers.splice(index, 1);
}

export async function periodicUpdate() {
    if (nextUpdate && Date.now() < nextUpdate) {
        return;
    }

    nextUpdate = Date.now() + TimeBetweenUpdates;

    const db = await getDatabase();
    const portfolios: Array<IPortfolio> = await db.fetchAllByField('periodic', true, COLLECTIONS.CRYPTO);

    for (let i = 0; i < portfolios.length; i++) {
        const portfolio = portfolios[i];
        if (!cachedMembers.find((member) => member.id === portfolio.id)) {
            const newMember = await getDiscordUser(portfolio.id);
            if (!newMember) {
                continue;
            }

            cachedMembers.push(newMember);
        }
    }

    for (let i = 0; i < cachedMembers.length; i++) {
        periodicPortfolio(cachedMembers[i]);
    }

    console.log(`Periodic Update Subscribers: ${cachedMembers.length}`);
}

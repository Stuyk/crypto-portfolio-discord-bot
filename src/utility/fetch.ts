import axios from 'axios';
import { ICoin } from '../interfaces/ICoin';
import { IPrice } from '../interfaces/IPrice';
import { IToken } from '../interfaces/IToken';
import { periodicUpdate } from './periodicUpdate';

const UpdateEvery = 60000;
let tokens: Array<IToken> = [];
let prices: Array<IPrice> = [];

let interval: NodeJS.Timeout;

export async function fetchTokens() {
    const response = await axios.get(`https://api.coingecko.com/api/v3/coins/list`).catch((err) => {
        return null;
    });

    if (!response || response.status !== 200) {
        return;
    }

    tokens = response.data;
    console.log('[BOT] List Updated');
}

export function createUpdateInterval() {
    if (interval) {
        return;
    }

    interval = setInterval(() => {
        console.log('[BOT] Updating Token List');
        fetchTokens();
        periodicUpdate();
    }, UpdateEvery);
}

function getTokenID(symbol: string): string | null {
    if (tokens.length <= 0) {
        return null;
    }

    const result = tokens.find((token) => token.symbol.toLowerCase() === symbol.toLowerCase());
    return result ? result.id : null;
}

async function updateTicker(id: string): Promise<boolean> {
    const response = await axios
        .get(`https://api.coingecko.com/api/v3/coins/${id}`, {
            params: { tickers: false, developer_data: false, community_data: false },
        })
        .catch((err) => {
            return null;
        });

    if (!response || !response.data) {
        return false;
    }

    const geckoData: ICoin = response.data;
    const index = prices.findIndex((x) => x.id === id);
    if (index >= 0) {
        prices[index] = {
            id: id,
            usd: geckoData.market_data.current_price.usd,
            btc: geckoData.market_data.current_price.btc,
            price_24: geckoData.market_data.price_change_24h,
            price_24_percentage: geckoData.market_data.price_change_percentage_24h,
            icon: geckoData.image.large,
            nextUpdate: Date.now() + 60000 * 3,
            name: geckoData.name,
        };
    } else {
        prices.push({
            id: id,
            usd: geckoData.market_data.current_price.usd,
            btc: geckoData.market_data.current_price.btc,
            price_24: geckoData.market_data.price_change_24h,
            price_24_percentage: geckoData.market_data.price_change_percentage_24h,
            icon: geckoData.image.large,
            nextUpdate: Date.now() + 60000 * 3,
            name: geckoData.name,
        });
    }

    return true;
}

async function getTokenPrice(id: string): Promise<IPrice | null> {
    let token = prices.find((token) => token.id === id);

    if ((token && Date.now() > token.nextUpdate) || !token) {
        const didUpdate = await updateTicker(id);

        if (!token && !didUpdate) {
            return null;
        }

        if (!token) {
            token = prices.find((token) => token.id === id);
        }
    }

    return token;
}

export async function fetchTickerPrice(ticker: string): Promise<IPrice | null> {
    const token = getTokenID(ticker);
    if (!token) {
        return null;
    }

    return await getTokenPrice(token);
}

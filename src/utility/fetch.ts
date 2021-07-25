import { periodicUpdate } from './periodicUpdate';
import axios from 'axios';

import { ICoin } from '../interfaces/ICoin';
import { IPrice } from '../interfaces/IPrice';
import { IToken } from '../interfaces/IToken';

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

export async function getTicker(id: string): Promise<IPrice> {
    let tickerData;

    if (id.toLowerCase() !== 'fox') {
        tickerData = tokens.find(x => x.symbol.toLocaleLowerCase() === id.toLocaleLowerCase());
    } else {
        tickerData = tokens.find(x => x.symbol.toLocaleLowerCase() === id.toLocaleLowerCase() && x.id === 'shapeshift-fox-token');
    }

    const response = await axios
        .get(`https://api.coingecko.com/api/v3/coins/${tickerData.id}`, {
            params: { tickers: false, developer_data: false, community_data: false },
        })
        .catch((err) => {
            console.log(err);
            return null;
        });

    if (!response || !response.data) {
        return null;
    }

    const geckoData: ICoin = response.data;
    return {
        id: id,
        usd: geckoData.market_data.current_price.usd,
        btc: geckoData.market_data.current_price.btc,
        price_24: geckoData.market_data.price_change_24h,
        price_24_percentage: geckoData.market_data.price_change_percentage_24h,
        icon: geckoData.image.large,
        nextUpdate: Date.now() + 60000 * 3,
        name: geckoData.name,
    }
}
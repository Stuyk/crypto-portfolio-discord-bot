import axios from 'axios';
import { IGeckoCoin } from 'src/interfaces/IGeckoCoin';
import { ICoin } from '../interfaces/ICoin';
import { IPrice } from '../interfaces/IPrice';
import { IToken } from '../interfaces/IToken';
import { periodicUpdate } from './periodicUpdate';

const UpdateEvery = 60000;
let tokens: Array<IToken> = [];
let prices: Array<IPrice> = [];

let interval: NodeJS.Timeout;
export async function fetchIconURL(price: IPrice): Promise<string> {
    const response = await axios
        .get(`https://api.coingecko.com/api/v3/coins/${price.name.toLowerCase().replace(/ /g, "")}`, {
            params: { tickers: false, developer_data: false, community_data: false },
        })
        .catch((err) => {
            return null;
        });

    if (!response || !response.data) {
        return "";
    }

    return (response.data as IGeckoCoin).image?.large;
}

export async function fetchTokens() {
    const response = await axios.get(`https://api.coinpaprika.com/v1/coins`).catch((err) => {
        return null;
    });

    if (!response || response.status !== 200) {
        return;
    }

    tokens = response.data;
    console.log('[BOT] Token List Updated');
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
        .get(`https://api.coinpaprika.com/v1/tickers/${id}`, {
            params: { quotes: "USD,BTC" }
        })
        .catch((err) => {
            return null;
        });

    if (!response || !response.data) {
        return false;
    }

    const paprikaData: ICoin = response.data;
    const index = prices.findIndex((x) => x.id === id);

    const priceData = {
        id: id,
        usd: paprikaData.quotes["USD"].price,
        btc: paprikaData.quotes["BTC"].price,
        price_24: paprikaData.quotes["USD"].price * ((paprikaData.quotes["USD"].percent_change_24h + 100) / 100 - 1),
        price_24_percentage: paprikaData.quotes["USD"].percent_change_24h,
        nextUpdate: Date.now() + 60000 * 3,
        name: paprikaData.name
    } as IPrice;

    if (index >= 0) {
        prices[index] = {
            ...priceData,
            icon: prices[index].icon
        };
    } else {
        prices.push(priceData);
        priceData.icon = await fetchIconURL(priceData);
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

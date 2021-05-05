import { IPriceData } from './IPriceData';

export interface ICoin {
    id: string;
    name: string;
    market_data: {
        current_price: IPriceData;
        price_change_24h: number;
        price_change_percentage_24h: number;
    };
    image: {
        thumb: string;
        small: string;
        large: string;
    };
}

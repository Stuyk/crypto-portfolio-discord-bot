import { IHistory } from './IHistory';

export interface IPortfolio {
    _id?: any;
    id?: string;
    privacy?: boolean;
    periodic?: {
        state?: boolean;
        lastUpdate?: number;
        interval?: number;
    };
    portfolio?: {
        [key: string]: number;
    };
    history?: {
        [key: string]: Array<IHistory>;
    };
}

export interface IPortfolioFull {
    total?: number;
    diff?: number;
    portfolio?: Array<IPortfolioCurrent>;
}

export interface IPortfolioCurrent {
    noPush?: boolean;
    ticker: string;
    amount: number;
    value: number;
    price: number;
    diff: number;
}

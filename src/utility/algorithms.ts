import ImageCharts from 'image-charts';

import { IPortfolio, IPortfolioCurrent, IPortfolioFull } from '../interfaces/IPortfolio';
import { getTicker } from '../utility/fetch';

const HistoryUpdateTimeDiff = 60000 * 5; // 5 Minutes Minimum

/**
 * Used to update price history based on new data.
 * @export
 * @param {IPortfolio} data
 * @param {Array<IPortfolioCurrent>} newData
 * @return {*}  {IPortfolio}
 */
export function updatePortfolio(data: IPortfolio, newData: Array<IPortfolioCurrent>): IPortfolio {
    for (let i = 0; i < newData.length; i++) {
        const currentData = newData[i];
        if (currentData.noPush) {
            continue;
        }

        // Push if there is no history data yet.
        if (data.history[currentData.ticker].length <= 0) {
            data.history[currentData.ticker].push({ date: Date.now(), value: currentData.value });
            continue;
        }

        // Determine if this meets the threshold for an update.
        const lastElement = data.history[currentData.ticker].length - 1;
        if (data.history[currentData.ticker][lastElement].date + HistoryUpdateTimeDiff > Date.now()) {
            continue;
        }

        console.log(`Updated ${currentData.ticker} for user`);

        // Push the data to the array.
        data.history[currentData.ticker].push({ date: Date.now(), value: currentData.value });
    }

    return data;
}

/**
 * Pulls all up-to-date information based on stored portfolio data.
 * @export
 * @param {IPortfolio} data
 * @return {*}  {Promise<IPortfolioFull>}
 */
export async function getPortfolioStats(data: IPortfolio): Promise<IPortfolioFull> {
    const currentFullPortfolio: IPortfolioFull = {};
    const currentPortfolio: Array<IPortfolioCurrent> = [];
    const keys = Object.keys(data.portfolio);

    let totalValue = 0;
    let baseValue = 0;

    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const amount = data.portfolio[key];
        const price = await getTicker(key);

        // Setup Price History if Non Existant
        if (!data.history[key]) {
            data.history[key] = [];
        }

        // If a price can't be determined. Push null pricing.
        if (!price) {
            currentPortfolio.push({
                ticker: key,
                amount,
                value: null,
                price: 0,
                noPush: true,
                diff: 0,
            });
            continue;
        }

        // Determine the total value of our assets based on coin price.
        const value = price.usd * amount;
        totalValue += value;

        // Calculating the difference based on history.
        // If there is no history then there is no difference.
        let diffCalc = 0;
        if (data.history[key][0]) {
            baseValue += data.history[key][0].value;
            diffCalc = value - data.history[key][0].value;
        } else {
            baseValue += value;
        }

        // Push to our new array of data.
        currentPortfolio.push({
            ticker: key,
            amount,
            price: price.usd,
            value: value,
            diff: diffCalc,
        });
    }

    // Update Portfolio Totals and Differences.
    // Diff includes the total difference between our base values and our current value.
    const orderPortfolio = currentPortfolio.sort((a, b) => {
        return a.value - b.value;
    });

    currentFullPortfolio.portfolio = orderPortfolio.reverse(); // Sorts from ascending to descending.
    currentFullPortfolio.total = totalValue;
    currentFullPortfolio.diff = totalValue - baseValue;

    return currentFullPortfolio;
}

export function getPortfolioChart(data: Array<IPortfolioCurrent>): string {
    let chartData = 'a:';
    let chartLabels = '';

    for (let i = 0; i < data.length; i++) {
        const dat = data[i];

        // Add to Chart Data
        if (chartData.length <= 2) {
            chartData += `${dat.value}`;
            chartLabels += `${dat.ticker.toUpperCase()}\r\n$${dat.value}`;
        } else {
            chartData += `,${dat.value}`;
            chartLabels += `|${dat.ticker.toUpperCase()}\r\n$${dat.value}`;
        }
    }

    return new ImageCharts().cht('pd').chd(chartData).chl(chartLabels).chs('512x512').toURL();
}

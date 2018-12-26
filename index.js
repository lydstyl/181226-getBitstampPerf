const csv = require('csvtojson')
const opts = require('./opts')
const csvFilePath = './Transactions.csv' // transactions.csv from bitstamp
const trades = {}
csv()
.fromFile(csvFilePath)
.then( (transactions) => {
    transactions.forEach( transaction => {
        const transactionDate = new Date( transaction.Datetime )
        const from = new Date( opts.from )
        const to = opts.to === 'now' ? new Date() : new Date( opts.to )
        if  ( 
                transactionDate >= from 
                && transactionDate <= to 
                && transaction['Account'] === 'Main Account'
                && (transaction['Sub Type'] === 'Sell' || transaction['Sub Type'] === 'Buy') 
            ) 
        {
            const cur = transaction.Amount.split(' ')[1] + transaction.Value.split(' ')[1]
            if ( !trades[cur] ) {
                trades[cur] = {}
                trades[cur].qty = {buy: 0, sell: 0, buyMinusSell: 0}
                trades[cur].fee = 0
                trades[cur].val = 0
                trades[cur].begin = trades[cur].end = transaction.Datetime 

                // console.log(trades);
                // console.log(trades.Rate); // moyenne vente sur moyenne achat
                trades[cur].buyRates = []
                trades[cur].avgBuyRate = 0
                trades[cur].sellRates = []
                trades[cur].avgSellRate = 0
            }
            if ( transaction['Sub Type'] === 'Buy') {
                trades[cur].qty.buy = trades[cur].qty.buy + Number.parseFloat( transaction.Amount.split(' ')[0] )
                trades[cur].qty.buyMinusSell = trades[cur].qty.buyMinusSell + Number.parseFloat( transaction.Amount.split(' ')[0] )

                trades[cur].val = trades[cur].val - Number.parseFloat( transaction.Value.split(' ')[0] )

                if ( transaction.Datetime < trades[cur].begin) trades[cur].begin = transaction.Datetime
                trades[cur].buyRates.push( Number.parseFloat( transaction.Rate.split(' ')[0] ) )
            }
            if ( transaction['Sub Type'] === 'Sell') {
                trades[cur].qty.sell = trades[cur].qty.sell - Number.parseFloat( transaction.Amount.split(' ')[0] )
                trades[cur].qty.buyMinusSell = trades[cur].qty.buyMinusSell - Number.parseFloat( transaction.Amount.split(' ')[0] )

                trades[cur].val = trades[cur].val + Number.parseFloat( transaction.Value.split(' ')[0] )

                if ( transaction.Datetime > trades[cur].end) trades[cur].end = transaction.Datetime
                trades[cur].sellRates.push( Number.parseFloat( transaction.Rate.split(' ')[0] ) )
            }
            trades[cur].fee = trades[cur].fee + Number.parseFloat( transaction.Fee.split(' ')[0] )
        }
    })
    // console.log( JSON.stringify(trades, null, 4));
    perfs = {} 
    Object.keys(trades).forEach( pair => {
        const trade = trades[pair]
        if ( (trade.qty.buyMinusSell / trade.qty.buy) <= 0.01 ) {
            if (!perfs[pair]) {
                perfs[pair] = {}
            }
            perfs[pair].gainMinusFees = trade.val - trade.fee
            // //  on veut pourcentPerf, begin date et end date et duration
            
            trade.sellRates.forEach( sellRate => {
                trade.avgSellRate += sellRate
            });
            trade.avgSellRate = trade.avgSellRate / trade.sellRates.length
            trade.buyRates.forEach( buyRate => {
                trade.avgBuyRate += buyRate
            })
            //trade.avgBuyRate -= trade.fee
            trade.avgBuyRate = trade.avgBuyRate / trade.buyRates.length
            perfs[pair].start = trade.begin
            perfs[pair].finish = trade.end
            perfs[pair].avgSell = trade.avgSellRate
            perfs[pair].avgBuy = trade.avgBuyRate
            perfs[pair].perfWithoutFee = ( (trade.avgSellRate / trade.avgBuyRate) - 1 ) * 100
            console.log(trade);
        } 
        
    })

    console.log(perfs);
})
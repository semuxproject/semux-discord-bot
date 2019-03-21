"use strict";
const request = require("request");
const fs = require("fs");

const MARKETCAP = 'https://api.coinmarketcap.com/v1/ticker/Semux';

var data = {};

function getPrice(){
	request(MARKETCAP, (error, response, body)=>{
		try{
			var dataCoin = JSON.parse(body);
		} catch (e) {
			console.log("Api Coinmarket Problem" + e);
			return
		}
		var marketcapInfo = dataCoin[0];
		data.priceUSD  = marketcapInfo['price_usd'];

		fs.writeFile("usdprice.txt",data.priceUSD,(err)=>{
			if(err) throw err;
		});
	});
}

module.exports = getPrice;

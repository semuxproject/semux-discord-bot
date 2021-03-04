const rp = require("request-promise");

const { faucetAddress } = require("../config/config-bot.json");
const { Users } = require("../models");
const { numberFormat, parseBal } = require("../utils.js");
const sendCoins = require("../sendCoins");

const API = "https://api.semux.info/v2.1.0/";

const doFaucet = async (authorId, bot, value, msg) => {
  const senderData = await Users.findOne({ where: { discord_id: authorId } });
  const userBal = JSON.parse(
    await rp(API + "account?address=" + senderData.address)
  );
  let availabeBal = 0;
  if (userBal.success) {
    availabeBal = numberFormat(parseBal(userBal.result.available));
  } else {
    msg.channel.send("Cannot start /faucet, serverside issue.");
    console.log("Cannot get user balance");
    return;
  }

  value = value.replace(/,/g, ".");
  let amount = parseFloat(value);
  if (isNaN(amount)) {
    return msg.channel.send("Wrong amount, must be a number.");
  }

  if (availabeBal < amount + 0.005) {
    msg.channel.send(
      `You don't have enough coins, your balance is ${availabeBal} SEM`
    );
    return;
  }
  try {
    await sendCoins(authorId, faucetAddress, String(amount), msg, "faucet");
  } catch (e) {
    console.log(e);
    return msg.reply("Serverside issue.");
  }
  msg.channel.send(
    `${amount} SEM sent to the faucet. Now everyone can use **/claim** ;)`
  );
};

module.exports = doFaucet;

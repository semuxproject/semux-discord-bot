const rp = require("request-promise");

const {
  faucetAddress,
  claimValue,
  claimPeriod,
} = require("../config/config-bot.json");
const { Users } = require("../models");
const { numberFormat, parseBal } = require("../utils.js");
const sendCoins = require("../sendCoins");

const API = "https://api.semux.info/v2.1.0/";

const doClaim = async (authorId, msg) => {
  const faucetBal = JSON.parse(
    await rp(API + "account?address=" + faucetAddress)
  );

  if (!faucetBal.success) {
    return msg.channel.send("Cannot get faucet balance, try later");
  }

  const faucetAvailable = numberFormat(parseBal(faucetBal.result.available));
  if (faucetAvailable < claimValue + 0.005) {
    return msg.reply(
      `Cannot claim SEM, faucet doesn't have enough coins. Balance: ${faucetAvailable} SEM`
    );
  }

  const userData = await Users.findOne({ where: { discord_id: authorId } });
  if (!userData) {
    return msg.reply("You don't have an account, type **/getAddress** first.");
  }

  if (userData.lastClaim) {
    if (userData.lastClaim > Date.now() - claimPeriod * 60 * 60 * 1000) {
      return msg.reply(
        `You have claimed already free SEM within ${claimPeriod} hours. Try again later.`
      );
    }
  }

  await sendCoins(null, userData.address, String(claimValue), msg, "claim");

  await Users.update(
    {
      lastClaim: Date.now(),
    },
    { where: { discord_id: authorId } }
  );

  return msg.reply(
    "Your free SEM will be deposited to your address within 30 seconds! Check **/balance** soon ;)"
  );
};

module.exports = doClaim;

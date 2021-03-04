const { Users } = require("../models");
const rp = require("request-promise");

const { getPrice, numberFormat, parseBal } = require("../utils.js");

const API = "https://api.semux.info/v2.1.0/";

const getBalance = async (msg, authorId) => {
  const price = getPrice();
  const user = await Users.findOne({ where: { discord_id: authorId } });
  if (!user)
    return msg.reply(
      "Sorry, but you don't have account, type **/getAddress** first."
    );
  const userBal = JSON.parse(await rp(API + "account?address=" + user.address));
  if (userBal.success) {
    const availabeBal = numberFormat(parseBal(userBal.result.available));
    const totalBal =
      parseBal(userBal.result.available) + parseBal(userBal.result.locked);
    let usdBalance = price * totalBal;
    usdBalance = numberFormat(usdBalance);
    if (totalBal === 0) {
      msg.channel.send(`Your wallet is empty: **${availabeBal}** SEM`);
    } else {
      msg.channel.send(
        `Your balance is: **${availabeBal}** SEM (*${usdBalance} USD*)`
      );
    }
  } else {
    return msg.channel.send("Semux api issues");
  }
};

module.exports = getBalance;

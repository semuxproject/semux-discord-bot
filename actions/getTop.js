const { Users, sequelize } = require('../models')

async function getTop (type) {
  let topList = await Users.findAll({
    where: { [type]: { [sequelize.Sequelize.Op.ne]: null } },
    order: [[type, 'DESC']],
    limit: 10
  })
  let string = `Top-10 ${type === 'sent' ? 'donators' : 'recipients'}:\n`
  let i = 1
  for (let row of topList) {
    string += `${i++}) ${row.username} **${row[type].toFixed(3)}** SEM\n`
  }
  return string
}

module.exports = getTop

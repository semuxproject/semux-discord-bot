"use strict";

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.addColumn("users", "lastClaim", Sequelize.BIGINT);
  },

  down: function (queryInterface) {
    return queryInterface.removeColumn("users", "lastClaim");
  },
};

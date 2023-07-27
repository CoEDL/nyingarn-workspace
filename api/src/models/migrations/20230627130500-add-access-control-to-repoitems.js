"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        /**
         * Add altering commands here.
         *
         * Example:
         * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
         */
        await queryInterface.addColumn("repoitems", "openAccess", {
            type: Sequelize.DataTypes.BOOLEAN,
            allowNull: true,
            default: false,
        });
        await queryInterface.addColumn("repoitems", "accessNarrative", {
            type: Sequelize.DataTypes.STRING,
            allowNull: true,
        });
        await queryInterface.addColumn("repoitems", "reviewDate", {
            type: Sequelize.DataTypes.DATE,
            allowNull: true,
        });
        await queryInterface.addColumn("repoitems", "accessControlList", {
            type: Sequelize.DataTypes.JSON,
            allowNull: true,
        });
    },

    async down(queryInterface, Sequelize) {
        /**
         * Add reverting commands here.
         *
         * Example:
         * await queryInterface.dropTable('users');
         */
        await queryInterface.removeColumn("repoitems", "openAccess");
        await queryInterface.removeColumn("repoitems", "accessNarrative");
        await queryInterface.removeColumn("repoitems", "accessControlList");
    },
};

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
        await queryInterface.addColumn("items", "publicationStatus", {
            type: Sequelize.DataTypes.ENUM(
                "inProgress",
                "awaitingReview",
                "published",
                "needsWork"
            ),
            allowNull: true,
        });
        await queryInterface.addColumn("items", "publicationMetadata", {
            type: Sequelize.DataTypes.JSONB,
            allowNull: true,
        });
        await queryInterface.addColumn("collections", "publicationStatus", {
            type: Sequelize.DataTypes.ENUM(
                "inProgress",
                "awaitingReview",
                "published",
                "needsWork"
            ),
            allowNull: true,
        });
        await queryInterface.addColumn("collections", "publicationMetadata", {
            type: Sequelize.DataTypes.JSONB,
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
        await queryInterface.removeColumn("items", "publicationStatus");
        await queryInterface.removeColumn("items", "publicationMetadata");
        await queryInterface.sequelize.query('DROP TYPE "enum_items_publicationStatus";');
        await queryInterface.sequelize.query('DROP TYPE "enum_items_accessType";');
        await queryInterface.removeColumn("collections", "publicationStatus");
        await queryInterface.removeColumn("collections", "publicationMetadata");
        await queryInterface.sequelize.query('DROP TYPE "enum_collections_publicationStatus";');
        await queryInterface.sequelize.query('DROP TYPE "enum_collections_accessType";');
    },
};

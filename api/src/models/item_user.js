"use strict";

module.exports = function (sequelize, DataTypes) {
    let ItemUser = sequelize.define(
        "item_user",
        {
            roleId: {
                type: DataTypes.UUID,
                allowNull: true,
            },
        },
        {
            timestamps: false,
        }
    );
    ItemUser.associate = function (models) {};

    return ItemUser;
};

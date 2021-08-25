"use strict";

module.exports = function (sequelize, DataTypes) {
    let Item = sequelize.define(
        "item",
        {
            id: {
                primaryKey: true,
                type: DataTypes.UUID,
                allowNull: false,
                defaultValue: DataTypes.UUIDV4,
            },
            identifier: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true,
            },
            data: {
                type: DataTypes.JSON,
                allowNull: true,
            },
        },
        {
            timestamps: true,
        }
    );
    Item.associate = function (models) {
        Item.belongsToMany(models.user, {
            through: models.item_user,
        });
    };

    return Item;
};

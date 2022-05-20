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
            through: 'item_users',
        });
        Item.hasMany(models.task, { onDelete: "cascade", hooks: true });
        Item.belongsToMany(models.collection, { through: "collection_items" });
    };

    return Item;
};

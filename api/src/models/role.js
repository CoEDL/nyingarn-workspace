"use strict";

module.exports = function (sequelize, DataTypes) {
    let Role = sequelize.define(
        "role",
        {
            id: {
                primaryKey: true,
                type: DataTypes.UUID,
                allowNull: false,
                defaultValue: DataTypes.UUIDV4,
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false,
            },
        },
        {
            timestamps: true,
        }
    );
    Role.associate = function (models) {};

    return Role;
};

"use strict";

module.exports = function (sequelize, DataTypes) {
    let Application = sequelize.define("application", {
        id: {
            primaryKey: true,
            type: DataTypes.UUID,
            allowNull: false,
            defaultValue: DataTypes.UUIDV4,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: true,
            },
        },
        origin: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: true,
            },
        },
        secret: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: true,
            },
        },
        metadata: {
            type: DataTypes.JSON,
        },
    });
    Application.associate = function (models) {
        // Application.hasMany(models.user, {
        //     onDelete: "CASCADE",
        //     foreignKey: { allowNull: false },
        // });
        // Application.hasMany(models.group, {
        //     onDelete: "CASCADE",
        //     foreignKey: { allowNull: false },
        // });
        // Application.hasMany(models.role, {
        //     onDelete: "CASCADE",
        //     foreignKey: { allowNull: false },
        // });
    };
    return Application;
};

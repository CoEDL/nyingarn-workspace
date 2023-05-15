"use strict";

export default function (sequelize, DataTypes) {
    let RepoItems = sequelize.define(
        "repoitem",
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
            },
            type: {
                type: DataTypes.STRING,
                allowNull: false,
            },
        },
        {
            timestamps: true,
        }
    );
    RepoItems.associate = function (models) {};

    return RepoItems;
}

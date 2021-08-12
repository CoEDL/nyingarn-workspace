"use strict";

module.exports = function (sequelize, DataTypes) {
    let Group = sequelize.define(
        "group",
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
    Group.associate = function (models) {
        Group.belongsToMany(models.user, {
            through: models.group_user,
        });
        Group.belongsToMany(models.role, {
            through: models.group_role,
        });
    };

    return Group;
};

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
    Role.associate = function (models) {
        Role.belongsTo(models.application, { onDelete: "CASCADE" });
        // User.belongsToMany(models.group, {
        //     through: models.group_user,
        //     foreignKey: "userId",
        //     otherKey: "groupId",
        // });
        // User.belongsToMany(models.role, {
        //     through: models.role_user,
        //     foreignKey: "userId",
        //     otherKey: "roleId",
        // });
        // User.hasMany(models.template, { foreignKey: { allowNull: false }, onDelete: "CASCADE" });
    };

    return Role;
};

"use strict";

module.exports = function (sequelize, DataTypes) {
    let User = sequelize.define(
        "user",
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
                // validate: {
                //     isEmail: true,
                // },
                // unique: true,
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
    User.associate = function (models) {
        User.belongsTo(models.application, { onDelete: "CASCADE" });
        User.belongsToMany(models.group, {
            through: models.group_user,
        });
        User.belongsToMany(models.role, {
            through: models.user_role,
        });
    };

    return User;
};

"use strict";

export default function (sequelize, DataTypes) {
    let Otp = sequelize.define("otp", {
        id: {
            primaryKey: true,
            type: DataTypes.UUID,
            allowNull: false,
            defaultValue: DataTypes.UUIDV4,
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false,
        },
    });
    Otp.associate = function (models) {
        Otp.belongsTo(models.user);
    };

    return Otp;
}

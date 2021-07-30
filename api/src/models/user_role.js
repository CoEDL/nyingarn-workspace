"use strict";

module.exports = function (sequelize, DataTypes) {
    var UserRole = sequelize.define(
        "user_role",
        {},
        {
            timestamps: false,
        }
    );

    return UserRole;
};

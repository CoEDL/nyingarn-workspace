"use strict";

module.exports = function (sequelize, DataTypes) {
    let GroupRole = sequelize.define(
        "group_role",
        {},
        {
            timestamps: false,
        }
    );

    return GroupRole;
};

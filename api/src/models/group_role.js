"use strict";

module.exports = function (sequelize, DataTypes) {
    var GroupRole = sequelize.define(
        "group_role",
        {},
        {
            timestamps: false,
        }
    );

    return GroupRole;
};

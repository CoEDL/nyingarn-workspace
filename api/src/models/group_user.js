"use strict";

module.exports = function (sequelize, DataTypes) {
    var GroupUser = sequelize.define(
        "group_user",
        {},
        {
            timestamps: false,
        }
    );

    return GroupUser;
};

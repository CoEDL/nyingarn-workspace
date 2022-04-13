"use strict";

module.exports = function (sequelize, DataTypes) {
    let CollectionUser = sequelize.define(
	"collection_user",
	{
	    roleId: {
		type: DataTypes.UUID,
		allowNull: true,
	    },
	},
	{
	    timestamps: false,
	}
    );
    CollectionUser.associate = function (models) {};

    return CollectionUser;
};

"use strict";

module.exports = function (sequelize, DataTypes) {
    let Collection = sequelize.define(
	"collection",
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
		unique: true,
	    },
	    data: {
		type: DataTypes.JSON,
		allowNull: true,
	    },
	},
	{
	    timestamps: true,
	}
    );
    Collection.associate = function (models) {
	Collection.belongsToMany(models.user, {
	    through: models.collection_user,
	});
    };

    return Collection;
};

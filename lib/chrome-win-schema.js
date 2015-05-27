"use strict";

var tld = require('tldjs'),
    Sequelize = require('sequelize');

var counter = 0;

module.exports = {
    fields_map : {
        'id'        : { type: Sequelize.BIGINT, primaryKey: true, unique: true, allowNull: false, field: "creation_utc"},
        'key'       : { type: Sequelize.TEXT, allowNull: false, field : "name"},
        'value'     : { type: Sequelize.TEXT, allowNull: false, field : "value" },
        'expires'   : {type: Sequelize.BIGINT, field : "expires_utc",
                        set: function (value) {
                            if (! value ) {
                                this.setDataValue('has_expires', 0);
                            }
                            this.setDataValue('expires', value * 10000);
                        },
                        get: function () {
                            return Math.round(this.getDataValue('expires') / 10000);
                        }
        },
        'domain'    : {type: Sequelize.TEXT, allowNull: false, field : "host_key"},
        'path'      : {type: Sequelize.TEXT, allowNull: false, field : "path"},
        'secure'    : {type: Sequelize.INTEGER, allowNull: false, field : "secure",
                        set: function (value) {
                            this.setDataValue('secure', value ? 1 : 0);
                        },
                        get: function () {
                            return this.getDataValue('secure') ? true : false;
                        }
        },
        'httpOnly'  : {type: Sequelize.INTEGER, allowNull: false, field : "httponly",
                        set: function (value) {
                            this.setDataValue('httpOnly', value ? 1 : 0);
                        },
                        get: function () {
                            return this.getDataValue('httpOnly') ? true : false;
                        }
        },
        'lastAccessed' : {type: Sequelize.BIGINT, field : "last_access_utc",
                        set: function (value) {
                            this.setDataValue('lastAccessed', value * 10000);
                        },
                        get: function () {
                            return Math.round(this.getDataValue('lastAccessed') / 10000);
                        }
        },
        'has_expires'  : {type: Sequelize.INTEGER, defaultValue: 1,field : "has_expires"},
        'persistent'  : {type: Sequelize.INTEGER, defaultValue: 1, field : "persistent"},
        'priority'  : {type: Sequelize.INTEGER, defaultValue: 1, field : "priority"},
        'encrypted_value'  : {type: Sequelize.BLOB, defaultValue: "", field : "encrypted_value"},
    },

    options : {
        timestamps: false,
        indexes : [
            {fields : [{attribute: "host_key", length: 25}]}
        ],

        getterMethods   : {
            creation : function () {
                return Math.round(this.getDataValue('id') / 10000);
            }
        },

        setterMethods : {
            creation : function () {
            }
        },

        hooks: {
            beforeValidate: function (instance, options, fn) {
                ++counter;
                if(counter >= 10000) { counter = 0; }
                if (! instance.id) {
                    instance.id = (new Date().getTime() * 10000) + counter;
                }
                fn(null, instance);
            }
        }
    }
};

"use strict";

var tld = require('tldjs'),
    Sequelize = require('sequelize');

module.exports = {
    fields_map : {
        'id'        : { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false, field: "id" },
        'key'       : { type: Sequelize.TEXT, allowNull: false, field : "name"},
        'value'     : { type: Sequelize.TEXT, allowNull: false, field : "value" },
        'expires'   : {type: Sequelize.INTEGER, field : "expiry"},
        'domain'    : {type: Sequelize.TEXT, allowNull: false, field : "host",
                        set: function (value) {
                            this.set('baseDomain', tld.getDomain(value.replace(/^\./,'')) );
                            this.setDataValue('domain', value);
                        }
        },
        'path'      : {type: Sequelize.TEXT, allowNull: false, field : "path"},
        'secure'    : {type: Sequelize.INTEGER, allowNull: false, field : "isSecure",
                        set: function (value) {
                            this.setDataValue('secure', value ? 1 : 0);
                        },
                        get: function () {
                            return this.getDataValue('secure') ? true : false;
                        }
        },
        'httpOnly'  : {type: Sequelize.INTEGER, allowNull: false, field : "isHttpOnly",
                        set: function (value) {
                            this.setDataValue('httpOnly', value ? 1 : 0);
                        },
                        get: function () {
                            return this.getDataValue('httpOnly') ? true : false;
                        }
        },
        'creation'  : {type: Sequelize.INTEGER, field : "creationTime"},
        'lastAccessed' : {type: Sequelize.INTEGER, field : "lastAccessed"},
        'baseDomain': {type: Sequelize.TEXT, field: 'baseDomain'}
    },

    options : {
        timestamps: false,
        indexes : [
            {fields : [{attribute: "host", length : 25}]},
            {fields : [{attribute: "name", length : 25}, {attribute: "host", length : 25}, {attribute : "path", length : 25}] }
        ]
    }
};

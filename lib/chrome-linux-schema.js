"use strict";

var tld = require('tldjs'),
    int = require('int'),
    url = require('url'),
    crypto = require('crypto'),
    Sequelize = require('sequelize');

var counter = 0;

var KEYLENGTH = 16,
    SALT = 'saltysalt',
    chrome_password = 'peanuts',
    ITERATIONS = 1,
    derived_key;

function decrypt(key, encryptedData) {
    var decipher,
        decoded,
        final,
        padding,
        iv = new Buffer(new Array(KEYLENGTH + 1).join(' '), 'binary');

    if ( ! encryptedData.length) {
        return '';
    }

    decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
    decipher.setAutoPadding(false);

    encryptedData = encryptedData.slice(3);

    decoded = decipher.update(encryptedData);

    padding = decoded[decoded.length - 1] || 0;

    return decoded.slice(0, decoded.length - padding).toString('utf8');
}

function encrypt(key,decrypedData) {
    var cipher,
        encoded,
        final,
        padding,
        iv = new Buffer(new Array(KEYLENGTH + 1).join(' '), 'binary');

    if (! decrypedData.length) return new Buffer([]);

    cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
    cipher.setAutoPadding(false);

    padding = 16 - (decrypedData.length % 16);

    var arr_padding = [];
    for (var i = 0; i < padding; i++){arr_padding.push(padding);}
    encoded = cipher.update(Buffer.concat([new Buffer(decrypedData), new Buffer(arr_padding)]));
    cipher.final();

    var result = Buffer.concat([new Buffer('v10'), encoded]);
    return result;
}

module.exports = {
    fields_map : {
        'id'        : { type: Sequelize.BIGINT, primaryKey: true, unique: true, allowNull: false, field: "creation_utc"},
        'key'       : { type: Sequelize.TEXT, allowNull: false, field : "name"},
        'value'     : { type: Sequelize.TEXT, allowNull: false, field : "value",
                        set: function (value) {
                            var encrypted_value = encrypt(derived_key, value);
                            this.setDataValue('encrypted_value', encrypted_value);
                            this.setDataValue('value', '');
                        },
                        get: function () {
                            var encrypted_value = this.getDataValue('encrypted_value');
                            return decrypt(derived_key, encrypted_value);
                        }
        },
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

    },

    init: function () {
        return new Sequelize.Promise(function (resolve, reject) {
            crypto.pbkdf2(chrome_password, SALT, ITERATIONS, KEYLENGTH, function (err, key) {
                if (err) {
                    reject(err);
                } else {
                    derived_key = key;
                    resolve(derived_key);
                }
            });
        });
    }

};

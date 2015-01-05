"use strict";

var UTIL = require('util'),
    Sequelize = require('sequelize'),
    TOUGH = require('tough-cookie2');

/**
 * 
 * @param {Object}   [options={}] An object with options.
 * @param {Object}   [options.cookies_model=''] The model for store cookies.
 * @param {String}   [options.cookies_table='cookies'] The table name for store cookies.
 * @param {Object}   [options.cookies_fields_map={}] 
 * @param {Object}   [options.cookies_fields_types={}] 
 * 
 */
function DbCookieStore(database, username, password, options) {
    
    if (database instanceof Sequelize) {
        this._sequalize = database;
    } else {
        this._sequalize = new Sequelize(database, username, password, options);
    }
    
    if (arguments.length === 1 || (arguments.length === 2 && typeof username === 'object')) {
        options = username || {};
    } else {
        options = options || {};
    }
    
    this.cookies_model = options.hasOwnProperty('cookies_model') ? options.cookies_model : null;
    this.cookies_table = options.hasOwnProperty('cookies_table') ? options.cookies_table : 'cookies';
    this.cookies_fields_map = options.hasOwnProperty('cookies_fields_map') ? options.cookies_fields_map : 
        {
            'id'    : 'id',
            'key'   : 'name',
            'value' : 'value',
            'expires': 'expiry',
            'maxAge': 'max_age',
            'domain': 'host',
            'path'  : 'path',
            'secure': 'is_secure',
            'httpOnly': 'is_http_only',
            'hostOnly': 'is_host_only',
            'creation': 'creation_time',
            'lastAccessed' : 'last_accessed'
        };
    this.cookies_field_types = options.hasOwnProperty('cookies_fields_types') ? options.cookies_fields_types :
        {
            'id'    : { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
            'key'   : { type: Sequelize.STRING, allowNull: false},
            'value' : { type: Sequelize.TEXT, allowNull: false },
            'expires' : {type: Sequelize.INTEGER.UNSIGNED},
            'maxAge' : {type: Sequelize.INTEGER.UNSIGNED},
            'domain' : {type: Sequelize.STRING, allowNull: false},
            'path'  : {type: Sequelize.STRING, allowNull: false},
            'secure' : {type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true},
            'httpOnly' : {type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true},
            
        };
    
}

UTIL.inherits(DbCookieStore, TOUGH.Store);

DbCookieStore.prototype.synchronous = false;

DbCookieStore.prototype._getModel = function (cb) {
    if (this.cookies_model) {
        return cb(null,this.cookies_model)
    } else {
        //create model
    }
};


DbCookieStore.prototype._createModel = function () {
    this._sequalize.define(table_name, {
        title: Sequelize.STRING,
        description: Sequelize.TEXT,
        deadline: Sequelize.DATE
    });
}


DbCookieStore.prototype.findCookie = function(domain, path, key, cb) {
  throw new Error('findCookie is not implemented');
};


DbCookieStore.prototype.findCookies = function(domain, path, cb) {
  throw new Error('findCookies is not implemented');
};


DbCookieStore.prototype.putCookie = function(cookie, cb) {
  throw new Error('putCookie is not implemented');
};


DbCookieStore.prototype.updateCookie = function(oldCookie, newCookie, cb) {
  // recommended default implementation:
  // return this.putCookie(newCookie, cb);
  throw new Error('updateCookie is not implemented');
};


DbCookieStore.prototype.removeCookie = function(domain, path, key, cb) {
  throw new Error('removeCookie is not implemented');
};


DbCookieStore.prototype.removeCookies = function removeCookies(domain, path, cb) {
  throw new Error('removeCookies is not implemented');
};


module.exports = DbCookieStore;
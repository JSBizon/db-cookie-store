"use strict";

var UTIL = require('util'),
    Sequelize = require('sequelize'),
    TOUGH = require('tough-cookie'),
    canonicalDomain = TOUGH.canonicalDomain,
    permuteDomain = TOUGH.permuteDomain,
    permutePath = TOUGH.permutePath,
    Q = require('q');


function _createDateOrZero(date) {
    var dateOrZero = function (date) {
        return isNaN(date.getTime()) ? new Date(0) : date;
    }
    return date instanceof Date ? dateOrZero(date) : dateOrZero(new Date(date));
}

function _normalizeDomains(domains) {
    if (!Array.isArray(domains)) {
        domains = [domains];
    }
    var h_domains = {},
        i = 0, d_l = 0;

    for (i = 0, d_l = domains.length; i < d_l; i++) {
        h_domains[domains[i]] = true;
    }

    for (i=0, d_l = domains.length; i < d_l; i++) {
        var domain = domains[i];
        if ( /^\./.test(domain) ) {
            domain = domain.substr(1);
        } else {
            domain = '.' + domain;
        }
        if (! h_domains[domain]) {
            h_domains[domain] = true;
        }
    }

    return Object.keys(h_domains);
}

/**
 *
 * @param {Object}   [options={}] An object with options.
 * @param {Object}   [options.cookies_model=''] The model for store cookies.
 * @param {Boolean}  [options.cookies_model_create=true] Automatically create table for store cookies if table doesn't exists
 * @param {String}   [options.cookies_table='cookies'] The table name for store cookies.
 * @param {Object}   [options.cookies_fields_map={}]
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
    this.cookies_model_create = options.hasOwnProperty('cookies_model_create') ? options.cookies_model_create : true;
    this.cookies_table = options.hasOwnProperty('cookies_table') ? options.cookies_table : 'cookies';
    this.cookies_fields_map = options.hasOwnProperty('cookies_fields_types') ? options.cookies_fields_types :
        {
            'id'    : { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false, field: "id" },
            'key'   : { type: Sequelize.STRING, allowNull: false, field : "name"},
            'value' : { type: Sequelize.TEXT, allowNull: false, field : "value" },
            'expires' : {type: Sequelize.INTEGER, field : "expiry"},
            'maxAge' : {type: Sequelize.INTEGER, field : "max_age"},
            'domain' : {type: Sequelize.STRING, allowNull: false, field : "host"},
            'path'  : {type: Sequelize.STRING, allowNull: false, field : "path"},
            'secure' : {type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true, field : "is_secure"},
            'httpOnly' : {type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true, field : "is_http_only"},
            'creation' : {type: Sequelize.INTEGER, field : "creation_time"},
            'lastAccessed' : {type: Sequelize.INTEGER, field : "last_accessed"}
        };

}

UTIL.inherits(DbCookieStore, TOUGH.Store);

DbCookieStore.prototype.synchronous = false;

DbCookieStore.prototype._getModel = function () {
    var self = this;
    if (this.cookies_model) {
        return Sequelize.Promise.resolve(this.cookies_model);
    } else {
        //create model
        this.cookies_model = this._sequalize.define(this.cookies_table, this.cookies_fields_map);
        if (this.cookies_model_create) {
            return this.cookies_model.sync();
        } else {
            return Sequelize.Promise.resolve(this.cookies_model);
        }
    }
};


DbCookieStore.prototype.serialize = function (model, cookie, instance) {

    instance = instance || model.build({});
    instance.set({
        'key' : cookie.key,
        'value' : cookie.value,
        'domain' : ! cookie.hostOnly ? '.' + cookie.domain : cookie.domain,
        'path' : cookie.path
    });
    if ('expires' in instance) {
        instance.set('expires', cookie.expires && cookie.expires != 'Infinity' ?
            Math.round(_createDateOrZero(cookie.expires).getTime() / 1000) : 0);
    }
    if ('maxAge' in instance) {
        instance.set('maxAge', cookie.maxAge ? parseInt(cookie.maxAge) : null);
    }
    if ('secure' in instance) {
        instance.set('secure', cookie.secure);
    }
    if ('httpOnly' in instance) {
        instance.set('httpOnly', cookie.httpOnly);
    }
    if ('creation' in instance) {
        instance.set('creation', cookie.creation ?
            Math.round(_createDateOrZero(cookie.creation).getTime() / 1000) : 0);
    }
    if ('lastAccessed' in instance) {
        instance.set('lastAccessed', cookie.lastAccessed ?
            Math.round(_createDateOrZero(cookie.lastAccessed).getTime() / 1000) : 0);
    }

    return instance;
};


DbCookieStore.prototype.deserialize = function (model) {
    var values = model.get();

    var d_c = new TOUGH.Cookie({
        key : values.key,
        value : values.value,
        expires : values.expires ? new Date(values.expires * 1000) : undefined,
        domain : canonicalDomain(values.domain),
        path : values.path || '/',
        secure : values.secure ? true : false,
        httpOnly : values.httpOnly,
        creation : values.creation ? new Date(values.creation * 1000) : undefined,
        lastAccessed : values.lastAccessed ? new Date(values.lastAccessed * 1000) : undefined,
        hostOnly : /^\./.test(values.domain) ? false : true
    });

    return d_c;
};


DbCookieStore.prototype.findCookie = function(domain, path, key, cb) {
    var self = this,
        can_domain = canonicalDomain(domain);

    if (! can_domain || ! path || ! key) return cb();

    var domains = _normalizeDomains(can_domain);

    this._getModel().then(function (model) {
        return model.find({ where: { domain : {'in' : domains}, path : path, key : key} });
    }).then(function (instance) {
        if (! instance) {
            cb();
        } else {
            cb(null, self.deserialize(instance));
        }
    }).
    catch(function (err) {
        cb(err);
    });
};


DbCookieStore.prototype.findCookies = function(domain, path, cb) {
    var self = this,
        results = [],
        i = 0,
        can_domain = canonicalDomain(domain);
    if (! domain ) return cb(null,[]);

    var domains = _normalizeDomains(permuteDomain(can_domain) || [can_domain]);

    console.log("Find in domains: ", domains);

    this._getModel().then(function (model) {
        var condition = {domain : { 'in' : domains } };
        if (path && path === '/') {
            condition.path = path;
        } else if (path) {
            var paths = permutePath(path) || [path];
            condition.path = { 'in' : paths };
        }
        return model.findAll({ where: condition });
    }).
    then(function (instances) {
        console.log("instances: ", instances.length);
        instances.forEach(function (instance) {
            results.push(self.deserialize(instance));
        }, self);
        cb(null, results);
    }).
    catch(function (err) {
        cb(err);
    });
};


DbCookieStore.prototype.putCookie = function(cookie, cb) {
    var self = this;

    if ( ! cookie || ! cookie.domain || ! cookie.key) {
        return cb();
    }

    var db_model;
    this._getModel().then(function (model) {
        db_model = model;
        var domain = canonicalDomain(cookie.domain);

        if ( ! cookie.hostOnly ) {
            if ( ! /^\./.test(domain)) {
                domain = '.' + domain;
            }
        } else {
            if (/^\./.test(domain)) {
                domain = domain.substr(1);
            }
        }

        return model.find({where : {domain : domain, path : cookie.path, key : cookie.key } });
    }).
    then(function (instance) {
        if (instance) {
            //already exists
            instance = self.serialize(db_model, cookie, instance);
        } else {
            //create new instance
            console.log("Cookie: ", cookie);
            instance = self.serialize(db_model, cookie);
        }
        return instance.save();
    }).
    then(function () {
        cb();
    }).
    catch(function (err) {
        cb(err);
    });
};


DbCookieStore.prototype.updateCookie = function(oldCookie, newCookie, cb) {
    return this.putCookie(newCookie, cb);
};


DbCookieStore.prototype.removeCookie = function(domain, path, key, cb) {
    var self = this,
        can_domain = canonicalDomain(domain);

    if (! can_domain || ! path || ! key) {
        return cb();
    }

    var domains = _normalizeDomains(can_domain);

    this._getModel().then(function (model) {
        return model.destroy({ where: { domain : {'in' : domains}, path : path, key : key} });
    }).
    then(function () {
        cb();
    }).
    catch(function (err) {
        cb(err);
    });

};


DbCookieStore.prototype.removeCookies = function removeCookies(domain, path, cb) {
    var self = this,
        can_domain = canonicalDomain(domain);
    if (! can_domain) {
        return cb();
    }

    var domains = _normalizeDomains(can_domain);

    this._getModel().then(function (model) {
        var where = {domain : {'in' : domains}};
        if (path) {
            where.path = path;
        }
        return model.destroy({where : where});
    }).
    then(function () {
        cb();
    }).
    catch(function (err) {
        cb(err);
    });
};


module.exports = DbCookieStore;

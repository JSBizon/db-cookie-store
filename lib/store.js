"use strict";

var UTIL = require('util'),
    Sequelize = require('sequelize'),
    TOUGH = require('tough-cookie'),
    canonicalDomain = TOUGH.canonicalDomain,
    permuteDomain = TOUGH.permuteDomain,
    permutePath = TOUGH.permutePath;



function _createDateOrZero(date) {
    var dateOrZero = function (date) {
        return isNaN(date.getTime()) ? new Date(0) : date;
    };
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

var store_scheme = {
    'default' : {

        fields_map : {
            'id'        : { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false, field: "id" },
            'key'       : { type: Sequelize.TEXT, allowNull: false, field : "key"},
            'value'     : { type: Sequelize.TEXT, allowNull: false, field : "value" },
            'expires'   : {type: Sequelize.INTEGER, field : "expires"},
            'maxAge'    : {type: Sequelize.INTEGER, field : "max_age"},
            'domain'    : {type: Sequelize.TEXT, allowNull: false, field : "domain"},
            'path'      : {type: Sequelize.TEXT, allowNull: false, field : "path"},
            'secure'    : {type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true, field : "secure"},
            'httpOnly'  : {type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true, field : "http_only"},
            'creation'  : {type: Sequelize.INTEGER, field : "creation_time"},
            'lastAccessed' : {type: Sequelize.INTEGER, field : "last_accessed"}
        },

        options : {
            timestamps: false,
            indexes : [
                {fields : [{attribute : "domain", length : 25}]},
                {fields : [{attribute: "key", length : 25}, {attribute : "domain", length : 25}, {attribute : "path", length: 25}] }
            ]
        }
    },

    'mozilla' : require('./mozilla-schema'),
    'chrome-win' : require('./chrome-win-schema')
};

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
    var schema;

    if (database instanceof Sequelize) {
        this._sequelize = database;
    } else {
        this._sequelize = new Sequelize(database, username, password, options);
    }

    if (arguments.length === 1 || (arguments.length === 2 && typeof username === 'object')) {
        options = username || {};
    } else {
        options = options || {};
    }

    this._transaction_q = new Sequelize.Promise.resolve();

    this.cookies_model = options.hasOwnProperty('cookies_model') ? options.cookies_model : null;
    this.cookies_model_create = options.hasOwnProperty('cookies_model_create') ? options.cookies_model_create : true;
    this.cookies_table = options.hasOwnProperty('cookies_table') ? options.cookies_table : 'cookies';
    this.cookies_store_schema = options.hasOwnProperty('cookies_store_schema') ? options.cookies_store_schema : 'default';

    if (this.cookies_store_schema) {
        if (typeof this.cookies_store_schema === 'string' || this.cookies_store_schema instanceof String) {
            if (! store_scheme[this.cookies_store_schema]) {
                throw Error("Unknown store schema '" + this.cookies_store_schema + "'");
            }
            schema = store_scheme[this.cookies_store_schema];
        } else {
            schema = this.cookies_store_schema;
        }

        this.cookies_fields_map = schema.fields_map;
        this.cookies_model_options = schema.options;
        this.cookies_schema_init = schema.init;
    }


    if (options.hasOwnProperty('cookies_fields_map') ) {
        this.cookies_fields_map = options.cookies_fields_map;
    }

    if (options.hasOwnProperty('cookies_model_options')) {
        this.cookies_model_options = options.cookies_model_options;
    }

    if (options.hasOwnProperty('cookies_schema_init')) {
        this.cookies_schema_init = options.cookies_schema_init;
    }

    this.transactions_queue = options.hasOwnProperty('transactions_queue') ? options.transactions_queue : true;

}

UTIL.inherits(DbCookieStore, TOUGH.Store);

DbCookieStore.prototype.synchronous = false;

DbCookieStore.prototype._getModel = function () {
    var self = this;
    if (this.cookies_model) {
        return Sequelize.Promise.resolve(this.cookies_model);
    } else {
        var cookies_schema_init = this.cookies_schema_init ? this.cookies_schema_init() : new Sequelize.Promise.resolve();

        return cookies_schema_init.then(function(){
            //create model
            var options = self.cookies_model_options || {};
            options.freezeTableName = true;
            self._new_cookies_model = self._sequelize.define(self.cookies_table, self.cookies_fields_map, options);

            if (self.cookies_model_create) {
                if (! self._model_sync_p) {
                    self._model_sync_p = self._new_cookies_model.sync();
                }
                return self._model_sync_p;
            } else {
                return Sequelize.Promise.resolve(self._new_cookies_model);
            }
        });
    }
};

DbCookieStore.prototype._isSqlite = function () {
    if (this._sequelize.options.dialect === 'sqlite') {
        return true;
    }
    return false;
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
        //expires : values.expires ? new Date(values.expires * 1000) : null,
        expires : values.expires ? new Date(values.expires * 1000) : 'Infinity',
        domain : canonicalDomain(values.domain),
        path : values.path || '/',
        secure : values.secure ? true : false,
        httpOnly : values.httpOnly,
        creation : values.creation ? new Date(values.creation * 1000) : null,
        lastAccessed : values.lastAccessed ? new Date(values.lastAccessed * 1000) : null,
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
    })
    .then(function (instance) {
        if (! instance) {
            cb();
        } else {
            cb(null, self.deserialize(instance));
        }
    })
    .catch(function (err) {
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

    this._getModel().then(function (model) {
        var condition = {domain : { 'in' : domains } };
        if (path && path === '/') {
            condition.path = path;
        } else if (path) {
            var paths = permutePath(path) || [path];
            condition.path = { 'in' : paths };
        }

        return model.findAll({ where: condition });
    })
    .then(function (instances) {
        instances.forEach(function (instance) {
            results.push(self.deserialize(instance));
        }, self);
        cb(null, results);
    })
    .catch(function (err) {
        cb(err);
    });
};


DbCookieStore.prototype._putCookieTransaction = function(model,cookie) {
    var self = this;

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

    return self._sequelize.transaction(function (t) {
        return model.find({where : {domain : domain, path : cookie.path, key : cookie.key } }, {transaction : t}).
            then(function (instance) {
                if (instance) {
                    //already exists
                    instance = self.serialize(model, cookie, instance);
                } else {
                    //create new instance
                    instance = self.serialize(model, cookie);
                }
                return instance.save({transaction : t});
            });
    });
};

DbCookieStore.prototype.putCookie = function(cookie, cb) {
    var self = this;

    if ( ! cookie || ! cookie.domain || ! cookie.key) {
        return cb();
    }

    self._getModel().then(function (model) {
        if (self._isSqlite() || self.transactions_queue ) {
            self._transaction_q = self._transaction_q.then(function () {
                return new Sequelize.Promise(function (resolve, rejected) {
                    self._putCookieTransaction(model, cookie)
                        .then(function () {
                            resolve();
                        })
                        .catch(function (err) {
                            //resolve();
                            rejected(err);
                        });
                });
            });
            return self._transaction_q;
        } else {
            return self._putCookieTransaction(model, cookie);
        }
    })
    .then(function () {
        cb();
    })
    .catch(function (err) {
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
        self._transaction_q = self._transaction_q.then(function () {
            return model.destroy({ where: { domain : {'in' : domains}, path : path, key : key} });
        });
        return self._transaction_q;
        //return model.destroy({ where: { domain : {'in' : domains}, path : path, key : key} });
    })
    .then(function () {
        cb();
    })
    .catch(function (err) {
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
        //return model.destroy({where : where});

        self._transaction_q = self._transaction_q.then(function () {
            return model.destroy({where : where});
        });
        return self._transaction_q;
    })
    .then(function () {
        cb();
    })
    .catch(function (err) {
        cb(err);
    });
};

DbCookieStore.prototype.export = function(cookie_store, cb) {
    var self = this;
    if ( arguments.length < 2) {
        cb = cookie_store;
        cookie_store = null;
    }
    if (! cookie_store) {
        cookie_store = [];
    }

    var fns = [];
    this._getModel().then(function (model) {
        return model.findAll();
    })
    .then(function (instances) {
        var counter = 0, errors = '';
        instances.forEach(function (instance) {
            var cookie = self.deserialize(instance);
            if (cookie_store instanceof TOUGH.Store) {
                ++counter;
                cookie_store.putCookie(cookie, function (error, ok) {
                    --counter;
                    if (error) {
                        errors += error;
                    }
                    if (counter <= 0) {
                        cb(errors ? errors : null,cookie_store);
                    }
                });
            } else {
                cookie_store.push(cookie);
            }
        }, self);

        if (! (cookie_store instanceof TOUGH.Store) ) {
            cb(null,cookie_store);
        }
    })
    .catch(function (err) {
        cb(err);
    });

    return cookie_store;
};


DbCookieStore.prototype.getAllCookies = function(cb) {
    this.export(function (err, cookies) {
        if (err) {
            cb(err);
        } else {
            cookies.sort(function(a,b) {
                return (a.creationIndex||0) - (b.creationIndex||0);
            });
            cb(null, cookies);
        }
    });
};

module.exports = DbCookieStore;

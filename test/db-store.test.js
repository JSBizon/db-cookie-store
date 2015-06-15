/*
mocha -g "" -r test/sqlite-globals test/*.test.js

 */
var expect = require('expect.js'),
    Sequelize = require('sequelize'),
    TOUGH = require('tough-cookie'),
    Q =     require('q'),
    extend = require('extend'),
    MemoryCookieStore = require('tough-cookie/lib/memstore').MemoryCookieStore,
    DbCookieStore = require('../lib/store'),
    EventEmitter = require('events').EventEmitter;


function randomStr () {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    for( var i=0; i < 10; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length))
    return text;
}


var cookies_table_name;

function getTableName () {
    if (! cookies_table_name) {
        cookies_table_name = randomStr();
    }
    return cookies_table_name;
}

function getDBStore (store_schema, table_name) {
    var options = extend(true, {}, DB_OPTIONS, {
        cookies_table : table_name || getTableName()
    });

    if (store_schema) {
        options.cookies_store_schema = store_schema;
    }

    return new DbCookieStore(DB_NAME, DB_USERNAME, DB_PASSWORD, options);
}

var test_cookies = [
        new TOUGH.Cookie({
            "key": "alpha",
            "value": "beta",
            "domain": "example.com",
            "path": "/foo",
            "expires": new Date("2038-01-19T03:14:07.000Z"),
            "httpOnly": true
        }),
        new TOUGH.Cookie({
            "key": "alpha",
            "value": "zeta",
            "domain": "example.com",
            "path": "/foo/boo",
            "expires": new Date("2038-01-19T03:14:07.000Z"),
            "httpOnly": true
        }),
        new TOUGH.Cookie({
            "key": "key_example3",
            "value": "value_example3",
            "domain": "example3.com",
            "path": "/foo",
            "expires": new Date("2038-01-19T03:14:07.000Z"),
            "hostOnly": true
        }),
        TOUGH.Cookie.parse("a=b; Domain=example.com; Path=/; HttpOnly"),
        TOUGH.Cookie.parse("a=b; Domain=example.com; Path=/; HttpOnly"),
        TOUGH.Cookie.parse('alpha1=beta1; Domain=example2.com; Path=/; Expires=Tue, 19 Jan 2038 03:14:07 GMT;'),
        TOUGH.Cookie.parse('alpha2=beta2; Domain=example2.com; Path=/; Expires=Tue, 19 Jan 2038 03:14:07 GMT;'),
        new TOUGH.Cookie({
            "key": "A_auth",
            "value": "bb5d8798e959f6982f38a31d8e92b7d3",
            "domain": "foo.test.com",
            "path": "/",
            "expires": new Date("2038-01-19T03:14:07.000Z"),
            "httpOnly": true,
            creation: new Date(),
            hostOnly: false
        }),
        new TOUGH.Cookie({
            "key": "A",
            "value": "a7ee73682a47529054ed7f89104fd5fdsde",
            "domain": "aff.store.com",
            "path": "/",
            "expires": new Date("2038-01-19T03:14:07.000Z"),
            "httpOnly": true,
            creation: new Date(),
            hostOnly: true
        }),
        new TOUGH.Cookie({
            "key": "A_auth",
            "value": "bb5fdfdlfd",
            "domain": "aff.store.com",
            "path": "/",
            "expires": new Date("2038-01-19T03:14:07.000Z"),
            "httpOnly": true,
            creation: new Date(),
            hostOnly: true
        }),
        new TOUGH.Cookie({
            "key": "A_pap_sid",
            "value": "a7ee73682a47529054ed7f89104fd5de",
            "domain": "aff.store.com",
            "path": "/",
            "expires": new Date("2038-01-19T03:14:07.000Z"),
            "httpOnly": true,
            creation: new Date()
        }),
        new TOUGH.Cookie({
            "key": "Id",
            "value": "982f38a31d8e92b7d3",
            "domain": "store.com",
            "path": "/",
            "expires": new Date("2038-01-19T03:14:07.000Z"),
            "httpOnly": true,
            creation: new Date(),
            hostOnly: false
        }),
        new TOUGH.Cookie({
            "key": "VisitorId",
            "value": "9439ee6f63767329",
            "domain": "store.com",
            "path": "/",
            "expires": new Date("2038-01-19T03:14:07.000Z"),
            "httpOnly": false,
            creation: new Date(),
            hostOnly: true
        }),
        new TOUGH.Cookie({
            "key": "Ids",
            "value": "8ds98e959ef6982f38a31d8e92b7",
            "domain": "aff.store.com",
            "path": "/foo",
            "expires": new Date("2038-01-19T03:14:07.000Z"),
            "httpOnly": false,
            creation: new Date()
        }),
        new TOUGH.Cookie({
            "key": "gpf_language",
            "value": "en-US",
            "domain": "aff.store.com",
            "path": "/",
            "expires": new Date("2038-01-19T03:14:07.000Z"),
            "httpOnly": true,
            creation: new Date()
        }),
        new TOUGH.Cookie({
            "key": "guest_id",
            "value": "v1:141105733211768497",
            "domain": "twitter.com",
            "path": "/",
            "expires": "2038-01-19T03:14:07.000Z",
            "httpOnly": false,
            creation: new Date()
        }),
        new TOUGH.Cookie({
            "key": "skin",
            "value": "noskin",
            "domain": "amazon.com",
            "path": "/",
            "httpOnly": false,
            "hostOnly": true,
            creation: new Date()
        })
];

function createsCookies (cookie_store, cb) {

    var fns = [];

    for (var i = 0; i < test_cookies.length ; i++) {
        if (! test_cookies[i]) {
            return cb("Can't create cookie instance");
        }
        var func = Q.nbind(cookie_store.putCookie, cookie_store);
        fns.push(func(test_cookies[i]));
    }

    Q.all(fns).then(function (answers) {
        cb();
    })
    .catch(function (err) {
        cb(err);
    })
    .done();
}



describe('Test db cookie store', function() {
    this.timeout(40000);
    var PARALLEL_WRITES = 10, cookie_store;

    function cleanupDB (store_schema, cb) {
        EventEmitter.defaultMaxListeners = 200;
        var options = extend(true, DB_OPTIONS, {
            cookies_table : getTableName()
        });

        new Sequelize(DB_NAME, DB_USERNAME, DB_PASSWORD, options)
            .getQueryInterface()
            .dropTable(getTableName())
            .then(function() {
                cookie_store = getDBStore(store_schema);
                cb();
            })
            .catch(function(e) {
                cb(e);
            });
    }

    var store_scheme = ['default', 'mozilla', 'chrome-win'];

    if ( process.platform === 'linux') {
        store_scheme.push({ name: 'chrome-linux-schema' ,schema : require('../lib/chrome-linux-schema') } );
    }

    before(function(done) {
        if (typeof databaseCreate == 'function') {
            databaseCreate(function (error) {
                done(error);
            });
        } else {
            done();
        }
    });

    after(function (done) {
        if (typeof databaseClean == 'function') {
            databaseClean(function (error) {
                done(error);
            });
        } else {
            done();
        }
    });

    beforeEach(function(done) {
        cleanupDB(null, function(err){
            done(err);
        });
    });


    describe("#constructor", function () {
        it('should create object use db options', function (done) {
            var cookie_store = getDBStore();
            expect(cookie_store).to.be.ok();
            expect(cookie_store).to.be.a(DbCookieStore);

            cookie_store.findCookie('testdomain.com','/', 'key', function (err,cookie) {
                expect(err).not.to.be.ok();
                done();
            });
        });

        it('should create object use Sequalize object', function (done) {
            var table_name = randomStr(),
                sequelize = new Sequelize(DB_NAME, DB_USERNAME, DB_PASSWORD, DB_OPTIONS),
                new_cookie_store = new DbCookieStore(sequelize, {
                    cookies_table : cookies_table_name
                });

            expect(new_cookie_store).to.be.ok();
            expect(new_cookie_store).to.be.a(DbCookieStore);

            new_cookie_store.findCookie('testdomain.com','/', 'key', function (err,cookie) {
                expect(err).not.to.be.ok();
                done();
            });

        });
    });


    store_scheme.forEach(function (test_store_schema) {

        var store_schema, store_schema_name;
        if ( typeof test_store_schema === 'string' || test_store_schema instanceof String) {
            store_schema = test_store_schema;
            store_schema_name = test_store_schema;
        } else {
            store_schema = test_store_schema.schema;
            store_schema_name = test_store_schema.name;
        }

        describe("#putCookie schema " + store_schema_name, function () {

            beforeEach(function(done) {
                cleanupDB(store_schema, function(err){
                    done(err);
                });
            });

            it('should put new cookie to db schema ' + store_schema_name , function (done) {
                var domain = 'putcookie.test.com',
                    path = '/',
                    key = 'yurh%$^9jkjgf&^%$#@!*()',
                    value = '[]{}!@#$%%^&*()_+?',
                    expire = new Date();

                expire.setDate(expire.getDate() + 2);

                var cookie = new TOUGH.Cookie({
                    domain : domain,
                    path : path,
                    secure : true,
                    expires : expire,
                    key : key,
                    value : value,
                    httpOnly: true
                });

                Q.nbind(cookie_store.putCookie, cookie_store)(cookie)
                    .then(function () {
                        var findCookies = Q.nbind(cookie_store.findCookies, cookie_store);
                        return findCookies(domain, null);
                    })
                    .then(function (cookies) {
                        expect(cookies).to.be.a(Array);
                        expect(cookies).to.have.length(1);

                        var cookie = cookies.pop();

                        expect(cookie).to.be.a(TOUGH.Cookie);
                        expect(cookie.key).to.be(key);
                        expect(cookie.value).to.be(value);
                        expect(Math.round(cookie.expires.getTime()/1000)).to.be(Math.round(expire.getTime()/1000));
                        expect(cookie.secure).to.be.ok();
                        expect(cookie.path).to.be('/');
                        expect(cookie.httpOnly).be.ok();

                        if (store_schema_name == 'mozilla') {
                            return cookie_store._getModel().then(function (model) {
                                return model.find({ where: { domain : {'in' : ['.' + domain]}, path : path, key : key} });
                            });
                        }
                    })
                    .then(function(instance) {
                        if (store_schema_name == 'mozilla') {
                            expect(instance.baseDomain).to.be('test.com');
                        }
                        done();
                    })
                    .catch(function (err) {
                        done(err);
                    })
                    .done();
            });

            it('should mass put cookies schema ' + store_schema_name, function (done) {

                var i=0,
                    stores_num = PARALLEL_WRITES,
                    keys = [],
                    cookies = [],
                    fns = [],
                    expire = new Date(),
                    test_domain = 'masstest.com';

                expire.setDate(expire.getDate() + 2);

                for (i = 0; i < stores_num; i++) {
                    var key = 'key ' + i;
                    var cookie = new TOUGH.Cookie({
                        domain : test_domain,
                        path : '/',
                        secure : true,
                        expires : expire,
                        key : key,
                        value : 'value ' + i,
                        httpOnly : false
                    });

                    var func = Q.nbind(cookie_store.putCookie, cookie_store);
                    fns.push(func(cookie));
                    keys.push(key);
                }

                Q.all(fns)
                    .then(function () {
                        var new_cookie_store = new getDBStore(store_schema);
                        return Q.nbind(new_cookie_store.findCookies, new_cookie_store)(test_domain, '/');
                    })
                    .then(function(cookies) {
                        expect(cookies).to.be.a(Array);
                        expect(cookies).to.have.length(PARALLEL_WRITES);
                        expect(cookies[0]).to.be.a(TOUGH.Cookie);


                        var map_key_cookie = {};

                        cookies.forEach(function (cookie) {
                            map_key_cookie[cookie.key] = cookie;
                        });

                        keys.forEach(function (key) {
                            expect(map_key_cookie[key]).to.be.a(TOUGH.Cookie);
                        });

                        done();

                    })
                    .catch(function (err){
                        done(err);
                    })
                    .done();
            });

            it('should put equal cookies schema ' + store_schema_name, function (done) {

                var i=0,
                    stores_num = PARALLEL_WRITES,
                    keys = [],
                    cookies = [],
                    fns = [],
                    expire = new Date(),
                    test_domain = 'masstest.com';

                expire.setDate(expire.getDate() + 2);

                for (i = 0; i < stores_num; i++) {
                    var key = 'key';
                    var cookie = new TOUGH.Cookie({
                        domain : test_domain,
                        path : '/',
                        secure : true,
                        expires : expire,
                        key : key,
                        value : 'value ' + i,
                        httpOnly : false
                    });

                    var func = Q.nbind(cookie_store.putCookie, cookie_store);
                    fns.push(func(cookie));
                    keys.push(key);
                }

                Q.all(fns)
                    .then(function () {
                        var new_cookie_store = new getDBStore(store_schema);
                        return Q.nbind(new_cookie_store.findCookies, new_cookie_store)(test_domain, '/');
                    })
                    .then(function(cookies) {
                        expect(cookies).to.be.a(Array);
                        expect(cookies).to.have.length(1);
                        done();
                    })
                    .catch(function (err){
                        done(err);
                    })
                    .done();

            });

            it('wrong argument schema ' + store_schema_name, function (done) {
                Q.nbind(cookie_store.putCookie, cookie_store)(null).then(function () {
                    done();
                })
                .catch(function (err){
                    done(err);
                })
                .done();
            });
        });

    });//store_scheme.forEach(function (store_schema) {


    store_scheme.forEach(function (test_store_schema) {

        var store_schema, store_schema_name;
        if ( typeof test_store_schema === 'string' || test_store_schema instanceof String) {
            store_schema = test_store_schema;
            store_schema_name = test_store_schema;
        } else {
            store_schema = test_store_schema.schema;
            store_schema_name = test_store_schema.name;
        }

        describe("#findCookie " + store_schema_name, function () {

            beforeEach(function(done) {

                cleanupDB(store_schema, function(err){
                    if (err) {
                        done(err);
                    } else {
                        createsCookies(cookie_store,function (error) {
                            done(error);
                        });
                    }
                });
            });

            it ('should find cookie ' + store_schema_name, function (done) {
                var findCookie = Q.nbind(cookie_store.findCookie, cookie_store);

                findCookie('amazon.com', '/', 'skin').then(function (cookie) {
                    expect(cookie).to.be.a(TOUGH.Cookie);
                    expect(cookie.key).to.be('skin');
                    expect(cookie.value).to.be('noskin');

                    expect(cookie.expires).to.be('Infinity');
                    expect(cookie.secure).not.to.be.ok();
                    expect(cookie.path).to.be('/');
                    expect(cookie.httpOnly).not.to.be.ok();

                    done();
                })
                .catch(function(err) {
                    done(err);
                })
                .done();
            });

            it ('should find host only cookie ' + store_schema_name, function (done) {
                //TOUGH.Cookie.parse("VisitorId=9439ee6f63767329; Expires=Wed, 23 Aug 2056 16:24:07 GMT; Domain=store.com; Path=/"),
                var findCookie = Q.nbind(cookie_store.findCookie, cookie_store);
                findCookie('store.com', '/', 'VisitorId').then(function (cookie) {
                    expect(cookie.value).to.be('9439ee6f63767329');
                    expect(cookie.domain).to.be('store.com');
                    expect(!cookie.hostOnly).to.be(false);
                    return findCookie('.store.com', '/', 'VisitorId');
                })
                .then(function (cookie){
                    expect(cookie).to.be.a(TOUGH.Cookie);
                    expect(cookie.value).to.be('9439ee6f63767329');
                    expect(cookie.domain).to.be('store.com');
                    expect(!cookie.hostOnly).to.be(false);
                    done();
                })
                .catch(function(err) {
                    done(err);
                })
                .done();
            });

            it ('should find not host only cookie ' + store_schema_name, function (done) {
                var findCookie = Q.nbind(cookie_store.findCookie, cookie_store);

                findCookie('.foo.test.com', '/', 'A_auth').then(function (cookie) {
                    expect(cookie).to.be.a(TOUGH.Cookie);
                    expect(cookie.key).to.be('A_auth');
                    expect(cookie.value).to.be('bb5d8798e959f6982f38a31d8e92b7d3');
                    expect(cookie.domain).to.be('foo.test.com');
                    expect(!cookie.hostOnly).to.be(true);
                    return findCookie('foo.test.com', '/', 'A_auth');
                })
                .then(function (cookie){
                    expect(cookie).to.be.a(TOUGH.Cookie);
                    expect(cookie.key).to.be('A_auth');
                    expect(cookie.value).to.be('bb5d8798e959f6982f38a31d8e92b7d3');
                    expect(cookie.domain).to.be('foo.test.com');
                    expect(!cookie.hostOnly).to.be(true);
                    done();
                })
                .catch(function(err) {
                    done(err);
                })
                .done();
            });

            it ('should find httpOnly cookie ' + store_schema_name, function (done) {
                var findCookie = Q.nbind(cookie_store.findCookie, cookie_store);
                findCookie('example.com', '/foo', 'alpha').then(function (cookie) {
                    expect(cookie).to.be.a(TOUGH.Cookie);
                    expect(cookie.key).to.be('alpha');
                    expect(cookie.value).to.be('beta');
                    expect(cookie.expires.getFullYear()).to.be(2038);
                    expect(cookie.path).to.be('/foo');
                    expect(cookie.httpOnly).to.be.ok();

                    done();
                })
                .catch(function(err) {
                    done(err);
                })
                .done();
            });

            it ('should not find cookie(wrong path) ' + store_schema_name, function (done) {
                var findCookie = Q.nbind(cookie_store.findCookie, cookie_store);

                findCookie('example.com', '/', 'alpha').then(function (cookie) {
                    expect(cookie).not.to.be.ok();
                    done();
                })
                .catch(function(err) {
                    done(err);
                })
                .done();
            });

            it ('should not find cookie(wrong domain) ' + store_schema_name, function (done) {
                var findCookie = Q.nbind(cookie_store.findCookie, cookie_store);
                findCookie('example2.com', '/', 'alpha').then(function (cookie) {
                    expect(cookie).not.to.be.ok();
                    done();
                })
                .catch(function(err) {
                    done(err);
                })
                .done();
            });

            it ('should find cookie(correct path) ' + store_schema_name, function (done) {
                var findCookie = Q.nbind(cookie_store.findCookie, cookie_store);

                findCookie('example.com', '/foo/boo', 'alpha').then(function (cookie) {
                    expect(cookie).to.be.a(TOUGH.Cookie);
                    done();
                })
                .catch(function(err) {
                    done(err);
                })
                .done();
            });

            it ('wrong arguments ' + store_schema_name, function (done) {
                var findCookie = Q.nbind(cookie_store.findCookie, cookie_store);
                findCookie(null, null, null).then(function (cookie) {

                    expect(cookie).not.to.be.ok();

                    done();
                })
                .catch(function(err) {
                    done(err);
                })
                .done();
            });
        });
    });//store_scheme.forEach(function (store_schema) {


    store_scheme.forEach(function (test_store_schema) {

        var store_schema, store_schema_name;
        if ( typeof test_store_schema === 'string' || test_store_schema instanceof String) {
            store_schema = test_store_schema;
            store_schema_name = test_store_schema;
        } else {
            store_schema = test_store_schema.schema;
            store_schema_name = test_store_schema.name;
        }

        describe("#findCookies " + store_schema_name, function () {


            beforeEach(function(done) {

                cleanupDB(store_schema, function(err){
                    if (err) {
                        done(err);
                    } else {
                        createsCookies(cookie_store,function (error) {
                            done(error);
                        });
                    }
                });
            });



            it ('should find all cookies by domain ' + store_schema_name, function (done) {
                var findCookies = Q.nbind(cookie_store.findCookies, cookie_store);

                findCookies('aff.store.com', null).then(function (cookies) {

                    expect(cookies).to.be.a(Array);
                    expect(cookies).to.have.length(7);
                    expect(cookies[0]).to.be.a(TOUGH.Cookie);

                    var num_store_domain = 0,
                        num_foo_path = 0,
                        num_aff_store_domain = 0,
                        num_host_only = 0;

                    cookies.forEach(function(c){
                        if (c.domain === 'store.com') {
                            ++num_store_domain;
                        }
                        if (c.domain === 'aff.store.com') {
                            ++num_aff_store_domain;
                        }
                        if (c.path === '/foo') {
                            ++num_foo_path;
                        }
                        if (c.hostOnly) {
                            ++num_host_only;
                        }
                    });

                    expect(num_store_domain).to.be(2);
                    expect(num_aff_store_domain).to.be(5);
                    expect(num_foo_path).to.be(1);
                    expect(num_host_only).to.be(3);

                    done();
                })
                .catch(function(err) {
                    done(err);
                })
                .done();
            });

            it ('should find all cookies by domain and path ' + store_schema_name, function (done) {
                var findCookies = Q.nbind(cookie_store.findCookies, cookie_store);

                findCookies('aff.store.com', '/').then(function (cookies) {
                    expect(cookies).to.be.a(Array);
                    expect(cookies).to.have.length(6);
                    expect(cookies[0]).to.be.a(TOUGH.Cookie);

                    var num_store_domain = 0,
                        num_foo_path = 0,
                        num_aff_store_domain = 0,
                        num_host_only = 0;

                    cookies.forEach(function(c) {
                        if (c.domain === 'store.com') {
                            ++num_store_domain;
                        }
                        if (c.domain === 'aff.store.com') {
                            ++num_aff_store_domain;
                        }
                        if (c.path === '/foo') {
                            ++num_foo_path;
                        }
                        if (c.hostOnly) {
                            ++num_host_only;
                        }
                    });

                    expect(num_store_domain).to.be(2);
                    expect(num_aff_store_domain).to.be(4);
                    expect(num_foo_path).to.be(0);
                    expect(num_host_only).to.be(3);

                    done();
                })
                .catch(function(err) {
                    done(err);
                })
                .done();
            });

            it ('wrong arguments ' + store_schema_name, function (done) {
                Q.nbind(cookie_store.findCookies, cookie_store)(undefined, null).then(function (cookies) {
                    expect(cookies).to.be.a(Array);
                    expect(cookies).to.have.length(0);
                    done();
                })
                .catch(function(err) {
                    done(err);
                })
                .done();
            });
        });
    });//store_scheme.forEach(function (store_schema) {


    store_scheme.forEach(function (test_store_schema) {

        var store_schema, store_schema_name;
        if ( typeof test_store_schema === 'string' || test_store_schema instanceof String) {
            store_schema = test_store_schema;
            store_schema_name = test_store_schema;
        } else {
            store_schema = test_store_schema.schema;
            store_schema_name = test_store_schema.name;
        }

        describe("#updateCookie " + store_schema_name, function () {

            beforeEach(function(done) {

                cleanupDB(store_schema, function(err){
                    if (err) {
                        done(err);
                    } else {
                        createsCookies(cookie_store,function (error) {
                            done(error);
                        });
                    }
                });
            });


            it('should update cookie by putCookie method ' + store_schema_name, function(done) {

                var cookie_store2;
                var findCookie = Q.nbind(cookie_store.findCookie, cookie_store, 'twitter.com', '/', 'guest_id');
                findCookie()
                .then(function(cookie) {
                    expect(cookie).to.be.a(TOUGH.Cookie);
                    expect(cookie.key).to.be('guest_id');
                    expect(cookie.value).to.be('v1:141105733211768497');
                    cookie.value = 'test value';
                    return Q.nbind(cookie_store.putCookie, cookie_store)(cookie);
                })
                .then(function() {
                    cookie_store2 = getDBStore(store_schema);
                    return Q.nbind(cookie_store2.findCookie, cookie_store2,'twitter.com', '/', 'guest_id')();
                })
                .then(function(cookie) {
                    expect(cookie.key).to.be('guest_id');
                    expect(cookie.value).to.be('test value');

                    //done();
                    return Q.nbind(cookie_store2.findCookies, cookie_store2,'twitter.com', null)();
                })
                .then(function (cookies) {
                    expect(cookies).to.be.a(Array);
                    expect(cookies).to.have.length(1);

                    done();
                })
                .catch(function(err) {
                    done(err);
                })
                .done();
            });

            it('should update cookie by updateCookie method ' + store_schema_name, function(done) {
                var findCookie = Q.nbind(cookie_store.findCookie, cookie_store, 'twitter.com', '/', 'guest_id');
                findCookie()
                .then(function(cookie) {

                    expect(cookie).to.be.a(TOUGH.Cookie);
                    expect(cookie.key).to.be('guest_id');
                    expect(cookie.value).to.be('v1:141105733211768497');

                    var cookie2 = new TOUGH.Cookie(JSON.parse(JSON.stringify(cookie)));

                    cookie2.value = 'test value';

                    return Q.nbind(cookie_store.updateCookie, cookie_store)(cookie, cookie2);
                })
                .then(function() {
                    var cookie_store2 = getDBStore(store_schema);
                    return Q.nbind(cookie_store2.findCookie, cookie_store2,'twitter.com', '/', 'guest_id')();
                })
                .then(function(cookie) {
                    expect(cookie.key).to.be('guest_id');
                    expect(cookie.value).to.be('test value');
                    done();
                })
                .catch(function(err) {
                    done(err);
                })
                .done();
            });
        });
    });//store_scheme.forEach(function (store_schema) {


    describe("#removeCookie", function () {
        beforeEach(function(done) {
            createsCookies(cookie_store,function (error) {
                done(error);
            });
        });

        it ('should remove cookie', function (done) {

            Q.nbind(cookie_store.removeCookie, cookie_store)('twitter.com', '/', 'guest_id').
                then(function (cookie) {
                    var cookie_store2 = getDBStore();
                    return Q.nbind(cookie_store2.findCookie, cookie_store2)('twitter.com', '/', 'guest_id');
                }).
                then(function (cookie) {
                    expect(cookie).not.to.be.ok();
                    done();
                }).
                catch(function (err){
                    done(err);
                }).
                done();
        });

        it ('wrong arguments', function (done) {

            Q.nbind(cookie_store.removeCookie, cookie_store)('twitter.com', '/', null).
                then(function (cookie) {
                    var cookie_store2 = getDBStore();
                    return Q.nbind(cookie_store2.findCookie, cookie_store2)('twitter.com', '/', 'guest_id');
                }).
                then(function (cookie) {
                    expect(cookie).to.be.ok();
                    done();
                }).
                catch(function (err){
                    done(err);
                }).
                done();
        });
    });

    describe("#removeCookies", function () {
        beforeEach(function(done) {
            createsCookies(cookie_store,function (error) {
                done(error);
            });
        });

        it ('should remove all domain cookies', function (done) {

            var test_domain = 'store.com';

            Q.nbind(cookie_store.findCookies, cookie_store)(test_domain, null).
                then(function (cookies) {
                    expect(cookies).to.be.a(Array);
                    expect(cookies).to.have.length(2);
                    return  Q.nbind(cookie_store.removeCookies, cookie_store)(test_domain, null);
                }).
                then(function () {
                    var cookie_store2 = getDBStore();
                    return Q.nbind(cookie_store2.findCookies, cookie_store2)(test_domain, null);
                }).
                then(function (cookies) {
                    expect(cookies).to.be.a(Array);
                    expect(cookies).to.have.length(0);
                    done();
                }).
                catch(function (err){
                    done(err);
                }).
                done();
        });

        it ('should remove cookies by path', function (done) {

            var test_domain = 'example.com';
            Q.nbind(cookie_store.findCookies, cookie_store)(test_domain, null).
                then(function (cookies) {
                    expect(cookies).to.be.a(Array);
                    expect(cookies).to.have.length(3);
                    return  Q.nbind(cookie_store.removeCookies, cookie_store)(test_domain, '/foo/boo');
                }).
                then(function () {
                    var cookie_store2 = getDBStore();
                    return Q.nbind(cookie_store2.findCookies, cookie_store2)(test_domain, null);
                }).
                then(function (cookies) {
                    expect(cookies).to.be.a(Array);
                    expect(cookies).to.have.length(2);

                    var is_foo = false, is_foo_boo = false;
                    cookies.forEach(function(c) {
                        if (c.path === '/foo') {
                            is_foo = true;
                        }
                        if (c.path === '/foo/boo') {
                            is_foo_boo = true;
                        }
                    });

                    expect(is_foo).to.be(true);
                    expect(is_foo_boo).to.be(false);

                    done();
                }).
                catch(function (err){
                    done(err);
                }).
                done();
        });

    });

    describe("#export", function () {
        beforeEach(function(done) {
            createsCookies(cookie_store,function (error) {
                done(error);
            });
        });

        it('should export cookies to the array', function (done) {
            Q.nbind(cookie_store.export, cookie_store)().
                then(function (exported_cookie_store) {
                    expect(exported_cookie_store).to.be.a(Array);
                    expect(exported_cookie_store).to.have.length(test_cookies.length - 1);

                    var is_key = false, num_store_domain = 0, num_foo_test = 0;
                    exported_cookie_store.forEach(function (cookie) {
                        if (cookie.key === 'A_pap_sid') {
                            is_key = true;
                        }
                        if (cookie.domain === 'store.com') {
                            ++num_store_domain;
                        }
                        if (cookie.domain === 'foo.test.com') {
                            ++num_foo_test;
                        }
                    });

                    expect(is_key).to.be(true);
                    expect(num_store_domain).to.be(2);
                    expect(num_foo_test).to.be(1);

                    done();
                }).
                catch(function (err) {
                    done(err);
                }).
                done();
        });

        it('should export cookies to the other store', function (done) {
            var memory_cookie_store = new MemoryCookieStore();
            Q.nbind(cookie_store.export, cookie_store)(memory_cookie_store)
                .then(function (memory_cookie_store){
                    var idx = memory_cookie_store.idx,
                        cookies_num = 0;

                    for (var domain in idx) {
                        if ( ! idx.hasOwnProperty(domain) ) continue;
                        for ( var path in idx[domain] ) {
                            if ( ! idx[domain].hasOwnProperty(path) ) continue;
                            for ( var key in idx[domain][path] ) {
                                if ( ! idx[domain][path].hasOwnProperty(key) ) continue;
                                var cookie = idx[domain][path][key];
                                if (cookie) {
                                    ++cookies_num;
                                }
                            }
                        }
                    }

                    expect(cookies_num).to.be(test_cookies.length - 1);

                    done();
                })
                .catch(function (err) {
                    done(err);
                })
                .done();
        });

        it('#getAllCookies',function(done){
            Q.nbind(cookie_store.getAllCookies, cookie_store)().
                then(function (cookies) {
                    expect(cookies).to.be.a(Array);
                    expect(cookies).to.have.length(test_cookies.length - 1);


                    var is_key = false, num_store_domain = 0, num_foo_test = 0;
                    cookies.forEach(function (cookie) {
                        if (cookie.key === 'A_pap_sid') {
                            is_key = true;
                        }
                        if (cookie.domain === 'store.com') {
                            ++num_store_domain;
                        }
                        if (cookie.domain === 'foo.test.com') {
                            ++num_foo_test;
                        }
                    });

                    expect(is_key).to.be(true);
                    expect(num_store_domain).to.be(2);
                    expect(num_foo_test).to.be(1);


                    done();
                }).
                catch(function (err) {
                    done(err);
                }).
                done();
        });
    });

    describe("#CookieJar", function () {
        var cookie_jar;
        beforeEach(function(done) {
            createsCookies(cookie_store,function (error) {
                if (! error) {
                    cookie_jar = new TOUGH.CookieJar(cookie_store);
                }
                done(error);
            });
        });

        it ('should create CookieJar object', function (done) {
            expect(cookie_jar).to.be.a(TOUGH.CookieJar);
            done();
        });

         it('should find cookie in CookieJar', function (done) {
            Q.nbind(cookie_jar.getCookies, cookie_jar)('http://foo.test.com')
                .then(function (cookies) {
                    expect(cookies).to.be.a(Array);
                    expect(cookies).to.have.length(1);
                    expect(cookies[0]).to.be.a(TOUGH.Cookie);
                    return Q.nbind(cookie_jar.getCookies, cookie_jar)('http://www.foo.test.com');
                })
                .then(function (cookies) {
                    expect(cookies).to.be.a(Array);
                    expect(cookies).to.have.length(1);
                    return Q.nbind(cookie_jar.getCookies, cookie_jar)('http://example.com');
                })
                .then(function (cookies) {
                    expect(cookies).to.be.a(Array);
                    expect(cookies).to.have.length(1);
                    return Q.nbind(cookie_jar.getCookies, cookie_jar)('http://example.com/foo/boo');
                })
                .then(function (cookies) {
                    expect(cookies).to.be.a(Array);
                    expect(cookies).to.have.length(3);
                    var is_foo_boo_path = false, is_foo_path = false, is_a_key = false, is_alpha_key = false;
                    cookies.forEach(function (cookie) {
                        if (cookie.path === '/foo/boo') {
                            is_foo_boo_path = true;
                        }
                        if (cookie.path === '/foo') {
                            is_foo_path = true;
                        }
                        if (cookie.key === 'a') {
                            is_a_key = true;
                        }
                        if (cookie.key === 'alpha') {
                            is_alpha_key = true;
                        }

                    });

                    expect(is_foo_boo_path).to.be(true);
                    expect(is_foo_path).to.be(true);
                    expect(is_a_key).to.be(true);
                    expect(is_alpha_key).to.be(true);

                    return Q.nbind(cookie_jar.getCookies, cookie_jar)('http://www.example.com/foo/boo');
                })
                .then(function (cookies) {
                    expect(cookies).to.be.a(Array);
                    expect(cookies).to.have.length(3);
                    return Q.nbind(cookie_jar.getCookies, cookie_jar)('http://aff.store.com');
                })
                .then(function (cookies) {
                    expect(cookies).to.be.a(Array);
                    expect(cookies).to.have.length(5);
                    return Q.nbind(cookie_jar.getCookies, cookie_jar)('https://www.aff.store.com');
                })
                .then(function (cookies) {
                    expect(cookies).to.be.a(Array);
                    expect(cookies).to.have.length(3);
                })
                .then(function () {
                    done();
                })
                .catch(function (err){
                    done(err);
                })
                .done();
        });

        it('should not find cookie in CookieJar', function (done) {

            Q.nbind(cookie_jar.getCookies, cookie_jar)('http://www.example3.com/').
                then(function (cookies) {
                    expect(cookies).to.be.a(Array);
                    expect(cookies).to.have.length(0);
                    return Q.nbind(cookie_jar.getCookies, cookie_jar)('http://example3.com/');
                })
                .then(function (cookies) {
                    expect(cookies).to.be.a(Array);
                    expect(cookies).to.have.length(0);
                    return Q.nbind(cookie_jar.getCookies, cookie_jar)('http://example3.com/foo');
                })
                .then(function (cookies) {
                    expect(cookies).to.be.a(Array);
                    expect(cookies).to.have.length(1);
                })
                .then(function () {
                    done();
                })
                .catch(function (err){
                    done(err);
                })
                .done();

        });

        it ('should find "host only" cookies', function (done) {
            Q.nbind(cookie_jar.getCookies, cookie_jar)('http://store.com/').
                then(function (cookies){
                    expect(cookies).to.be.a(Array);
                    expect(cookies).to.have.length(2);
                    return Q.nbind(cookie_jar.getCookies, cookie_jar)('http://www.store.com/')
                })
                .then(function (cookies) {
                    expect(cookies).to.be.a(Array);
                    expect(cookies).to.have.length(1);
                })
                .then(function () {
                    done();
                })
                .catch(function (){
                    done(err);
                })
                .done();
        });

        it('should put cookie in CookieJar', function (done) {

            var expire = new Date();

            expire.setDate(expire.getDate() + 2);

            var cookie = new TOUGH.Cookie({
                expires : expire,
                key : 'key111',
                value : 'value222',
                httpOnly : false
            });

            Q.nbind(cookie_jar.setCookie, cookie_jar)(cookie, 'http://setcookietest.com/').
                then( function (cookie) {
                    expect(cookie).to.be.a(TOUGH.Cookie);
                    return Q.nbind(cookie_jar.getCookies, cookie_jar)('http://setcookietest.com/test/path');
                })
                .then( function (cookies) {
                    expect(cookies).to.be.a(Array);
                    expect(cookies).to.have.length(1);
                    expect(cookies[0]).to.be.a(TOUGH.Cookie);
                })
                .then(function () {
                    done();
                })
                .catch(function (err){
                    done(err);
                })
                .done();
        });

        it('should save cookie into DB from CookieJar', function (done) {

            var expire = new Date();

            expire.setDate(expire.getDate() + 2);

            var cookie = new TOUGH.Cookie({
                path : '/test/path',
                expires : expire,
                key : 'key312',
                value : 'value333',
                httpOnly : false
            });

            Q.nbind(cookie_jar.setCookie, cookie_jar)(cookie, 'http://setcookietest.com/')
                .then( function (cookie) {
                    expect(cookie).to.be.a(TOUGH.Cookie);

                    var cookie_jar2 = new TOUGH.CookieJar(getDBStore());
                    return Q.nbind(cookie_jar2.getCookies, cookie_jar2)('http://setcookietest.com/test/path');
                })
                .then( function (cookies) {
                    expect(cookies).to.be.a(Array);
                    expect(cookies).to.have.length(1);
                    expect(cookies[0]).to.be.a(TOUGH.Cookie);

                    var cookie_jar2 = new TOUGH.CookieJar(getDBStore());

                    return Q.nbind(cookie_jar2.getCookies, cookie_jar2)('http://setcookietest.com/');
                })
                .then( function (cookies) {
                    expect(cookies).to.be.a(Array);
                    expect(cookies).to.have.length(0);
                })
                .then(function () {
                    done();
                })
                .catch(function (err){
                    done(err);
                })
                .done();

        });

        it('should use secure cookie for https only', function (done) {

            var expire = new Date();

            expire.setDate(expire.getDate() + 2);

            var cookie = new TOUGH.Cookie({
                expires : expire,
                secure: true,
                key : 'key232',
                value : 'value212',
                httpOnly : false
            });

            Q.nbind(cookie_jar.setCookie, cookie_jar)(cookie, 'http://setcookietest.com/')
                .then( function (cookie) {
                    expect(cookie).to.be.a(TOUGH.Cookie);
                    return Q.nbind(cookie_jar.getCookies, cookie_jar)('https://setcookietest.com/test/path');
                })
                .then( function (cookies) {
                    expect(cookies).to.be.a(Array);
                    expect(cookies).to.have.length(1);
                    expect(cookies[0]).to.be.a(TOUGH.Cookie);

                    return Q.nbind(cookie_jar.getCookies, cookie_jar)('http://setcookietest.com/test/path');
                })
                .then( function (cookies) {
                    expect(cookies).to.be.a(Array);
                    expect(cookies).to.have.length(0);
                })
                .then(function () {
                    done();
                })
                .catch(function (err){
                    done(err);
                })
                .done();

        });

        it('should remove expired Cookie from CookieJar', function (done) {
            var expire = new Date();

            expire.setDate(expire.getDate() - 2);

            var cookie = new TOUGH.Cookie({
                expires : expire,
                key : 'key',
                value : 'value',
                httpOnly : false
            });

            Q.nbind(cookie_jar.setCookie, cookie_jar)(cookie, 'http://setcookietest.com/')
                .then( function (cookie) {
                    expect(cookie).to.be.a(TOUGH.Cookie);
                    return Q.nbind(cookie_jar.getCookies, cookie_jar)('http://setcookietest.com/');
                })
                .then( function (cookies) {
                    expect(cookies).to.be.a(Array);
                    expect(cookies).to.have.length(0);

                    return new Sequelize.Promise(function (resolve, rejected) {
                        setTimeout(function () {
                            var cookie_store2 = getDBStore();
                            Q.nbind(cookie_store2.findCookies, cookie_store2)('setcookietest.com', null)
                            .then(function(cookies) {
                                resolve(cookies);
                            })
                            .catch(function(err){
                                rejected(err);
                            });
                        }, 1000)
                    });
                })
                .then( function (cookies) {
                    expect(cookies).to.be.a(Array);
                    expect(cookies).to.have.length(0);
                })
                .then(function () {
                    done();
                })
                .catch(function (err){
                    done(err);
                })
                .done();

        });

        it('should save "host only" cookies correctly', function (done) {
            var cookies_urls = ['http://aff.store.com/',
                                'http://www.aff.store.com/',
                                'http://store.com',
                                'http://www.store.com'],
                fns = [];
            for (i = 0; i < cookies_urls.length; i++) {
                var func = Q.nbind(cookie_jar.getCookies, cookie_jar);
                fns.push(func(cookies_urls[i]));
            }

            var cookie_table_name = randomStr(),
                cookie_store2 = getDBStore(null,cookie_table_name),
                cookie_jar2 = new TOUGH.CookieJar(cookie_store2);

            Q.all(fns).spread(function(cookies1,cookies2,cookies3,cookies4){
                expect(cookies1).to.be.a(Array);
                expect(cookies1).to.have.length(5);
                expect(cookies2).to.be.a(Array);
                expect(cookies2).to.have.length(3);
                expect(cookies3).to.be.a(Array);
                expect(cookies3).to.have.length(2);
                expect(cookies4).to.be.a(Array);
                expect(cookies4).to.have.length(1);

                var all_cookies = cookies1.concat(cookies1, cookies2, cookies3,cookies4),
                    put_fns = [];

                for (i = 0; i < all_cookies.length; i++) {
                    var func = Q.nbind(cookie_store2.putCookie, cookie_store2);
                    put_fns.push(func(all_cookies[i]));
                }

                return Q.all(put_fns);
            }).then(function () {
                return Q.nbind(cookie_jar2.getCookies, cookie_jar2)('http://aff.store.com/');
            }).then(function (cookies) {
                expect(cookies).to.be.a(Array);
                expect(cookies).to.have.length(5);
                return Q.nbind(cookie_jar2.getCookies, cookie_jar2)('http://store.com/');
            }).then(function (cookies) {
                expect(cookies).to.be.a(Array);
                expect(cookies).to.have.length(2);
                done();
            }).
            catch(function (err){
                done(err);
            }).
            done();

        });

        it('#serialize', function (done) {
            Q.nbind(cookie_jar.serialize, cookie_jar)()
                .then(function (serialized_object) {
                    expect(serialized_object.cookies).to.be.a(Array);
                    expect(serialized_object.cookies).to.have.length(test_cookies.length - 1);
                    done();
                })
                .catch(function(err){
                    done(err);
                })
                .done();
        });

    });

});

/*
mocha -g "" -r test/sqlite-globals test/*.test.js

 */
var expect = require('expect.js'),
    Sequelize = require('sequelize'),
    TOUGH = require('tough-cookie'),
    Q =     require('q'),
    DbCookieStore = require('../lib/store');

function randomStr () {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
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

function getDBStore () {
    return new DbCookieStore(DB_NAME, DB_USERNAME, DB_PASSWORD, DB_OPTIONS, {
        cookies_table : getTableName()
    });
}

function createsCookies (cookie_store, cb) {

    var test_cookies = [
        TOUGH.Cookie.parse('alpha=beta; Domain=example.com; Path=/foo; Expires=Tue, 19 Jan 2038 03:14:07 GMT; HttpOnly'),
        new TOUGH.Cookie({"key":"alpha","value":"beta","domain":"example.com","path":"/",
            "expires": new Date("2038-01-19T03:14:07.000Z"),"httpOnly":true}),
        TOUGH.Cookie.parse("a=b; Domain=example.com; Path=/; HttpOnly"),
        TOUGH.Cookie.parse("a=b; Domain=example.com; Path=/; HttpOnly"),
        TOUGH.Cookie.parse('alpha1=beta1; Domain=example2.com; Path=/; Expires=Tue, 19 Jan 2038 03:14:07 GMT;'),
        TOUGH.Cookie.parse('alpha2=beta2; Domain=example2.com; Path=/; Expires=Tue, 19 Jan 2038 03:14:07 GMT;'),
        new TOUGH.Cookie({"key":"A_auth","value":"bb5d8798e959f6982f38a31d8e92b7d3","domain":"foo.test.com","path":"/",
            "expires":new Date("2038-01-19T03:14:07.000Z"),"httpOnly":true,creation : new Date(), hostOnly : false}),
        new TOUGH.Cookie({"key":"A","value":"a7ee73682a47529054ed7f89104fd5fdsde","domain":"aff.store.com","path":"/",
            "expires":new Date("2038-01-19T03:14:07.000Z"),"httpOnly":true,creation : new Date(), hostOnly : true}),
        new TOUGH.Cookie({"key":"A_auth","value":"bb5fdfdlfd","domain":"aff.store.com","path":"/",
            "expires":new Date("2038-01-19T03:14:07.000Z"),"httpOnly":true,creation : new Date(), hostOnly : true}),
        new TOUGH.Cookie({"key":"A_pap_sid","value":"a7ee73682a47529054ed7f89104fd5de","domain":"aff.store.com","path":"/",
            "expires":new Date("2038-01-19T03:14:07.000Z"),"httpOnly":true,creation : new Date()}),
        new TOUGH.Cookie({"key":"Id","value":"982f38a31d8e92b7d3","domain":"store.com","path":"/",
            "expires":new Date("2038-01-19T03:14:07.000Z"),"httpOnly":true,creation : new Date(), hostOnly : false}),
        new TOUGH.Cookie({"key":"VisitorId","value":"9439ee6f63767329","domain":"store.com","path":"/",
            "expires":new Date("2038-01-19T03:14:07.000Z"),"httpOnly":false,creation : new Date(), hostOnly : true}),
        new TOUGH.Cookie({"key":"Id","value":"8ds98e959ef6982f38a31d8e92b7","domain":"aff.store.com","path":"/",
            "expires":new Date("2038-01-19T03:14:07.000Z"),"httpOnly":false,creation : new Date()}),
        new TOUGH.Cookie({"key":"gpf_language","value":"en-US","domain":"aff.store.com","path":"/",
            "expires":new Date("2038-01-19T03:14:07.000Z"),"httpOnly":true,creation : new Date()}),
        new TOUGH.Cookie({"key":"guest_id","value":"v1:141105733211768497","domain":"twitter.com","path":"/",
            "expires": "2038-01-19T03:14:07.000Z","httpOnly":false,creation : new Date()}),
        new TOUGH.Cookie({"key":"skin","value":"noskin","domain":"amazon.com","path":"/",
            "httpOnly":false, "hostOnly" : true, creation : new Date()})
    ];

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
        console.log("Catch error: ", err);
        cb(err);
    })
    .done();
}

describe('Test db cookie store', function() {
    var PARALLEL_WRITES = 50, cookie_store;

    before(function(done) {
        this.timeout(10000);
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
            this.timeout(10000);
            databaseClean(function (error) {
                done(error);
            });
        } else {
            done();
        }
    });

    beforeEach(function(done) {
        console.log("global before each");
        new Sequelize(DB_NAME, DB_USERNAME, DB_PASSWORD, DB_OPTIONS)
        .getQueryInterface()
        .dropTable(getTableName())
        .then(function() {
            cookie_store = getDBStore();
            done();
        })
        .catch(function(e) {
            done(e);
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

    describe("#putCookie", function () {

        it('should put new cookie to db', function (done) {
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

                    done();
                })
                .catch(function (err) {
                    done(err);
                })
                .done();
        });

        it('should mass put cookies', function (done) {
            this.timeout(10000);

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
                    var new_cookie_store = new getDBStore();
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
                }).
                done();
        });
    });


    describe("#findCookie", function () {

        beforeEach(function(done) {
            this.timeout(10000);
            createsCookies(cookie_store,function (error) {
                done(error);
            });

        });

        it ('should find cookie', function (done) {
            this.timeout(10000);
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
            }).
            catch(function(err) {
                done(err);
            }).
            done();
        });

        it ('should find host only cookie', function (done) {
            //TOUGH.Cookie.parse("VisitorId=9439ee6f63767329; Expires=Wed, 23 Aug 2056 16:24:07 GMT; Domain=store.com; Path=/"),
            var findCookie = Q.nbind(cookie_store.findCookie, cookie_store);
            findCookie('store.com', '/', 'VisitorId').then(function (cookie) {
                console.log("Found cookie: ", cookie, !cookie.hostOnly);
                expect(cookie.value).to.be('9439ee6f63767329');
                expect(cookie.domain).to.be('store.com');
                expect(!cookie.hostOnly).to.be(false);
                return findCookie('.store.com', '/', 'VisitorId');
            }).
            then(function (cookie){
                expect(cookie).to.be.a(TOUGH.Cookie);
                expect(cookie.value).to.be('9439ee6f63767329');
                expect(cookie.domain).to.be('store.com');
                expect(!cookie.hostOnly).to.be(false);
                done();
            }).
            catch(function(err) {
                done(err);
            }).
            done();
        });

        it ('should find not host only cookie', function (done) {
            var findCookie = Q.nbind(cookie_store.findCookie, cookie_store);

            findCookie('.foo.test.com', '/', 'A_auth').then(function (cookie) {
                console.log("Found cookie: ", cookie, !cookie.hostOnly);
                expect(cookie).to.be.a(TOUGH.Cookie);
                expect(cookie.key).to.be('A_auth');
                expect(cookie.value).to.be('bb5d8798e959f6982f38a31d8e92b7d3');
                expect(cookie.domain).to.be('foo.test.com');
                expect(!cookie.hostOnly).to.be(true);
                return findCookie('foo.test.com', '/', 'A_auth');
            }).
            then(function (cookie){
                expect(cookie).to.be.a(TOUGH.Cookie);
                expect(cookie.key).to.be('A_auth');
                expect(cookie.value).to.be('bb5d8798e959f6982f38a31d8e92b7d3');
                expect(cookie.domain).to.be('foo.test.com');
                expect(!cookie.hostOnly).to.be(true);
                done();
            }).
            catch(function(err) {
                done(err);
            }).
            done();
        });

        it ('should find httpOnly cookie', function (done) {
            var findCookie = Q.nbind(cookie_store.findCookie, cookie_store);
            findCookie('.example.com', '/foo', 'alpha').then(function (cookie) {
                expect(cookie).to.be.a(TOUGH.Cookie);
                expect(cookie.key).to.be('alpha');
                expect(cookie.value).to.be('beta');
                expect(cookie.expires.getFullYear()).to.be(2038);
                expect(cookie.path).to.be('/foo');
                expect(cookie.httpOnly).to.be.ok();

                done();
            }).
            catch(function(err) {
                done(err);
            }).
            done();
        });

        it ('should not find cookie(wrong path)', function (done) {
            var findCookie = Q.nbind(cookie_store.findCookie, cookie_store);

            findCookie('example.com', '/', 'alpha').then(function (cookie) {
                expect(cookie).not.to.be.ok();
                done();
            }).
            catch(function(err) {
                done(err);
            }).
            done();

        });
    });


    describe("#findCookies", function () {

    });

    describe("#updateCookie", function () {

        beforeEach(function(done) {
            this.timeout(10000);
            createsCookies(cookie_store,function (error) {
                done(error);
            });
        });

        it('should update cookie', function(done) {
            var findCookie = Q.nbind(cookie_store.findCookie, cookie_store, 'twitter.com', '/', 'guest_id');
            findCookie().
            then(function(cookie) {

                expect(cookie).to.be.a(TOUGH.Cookie);
                expect(cookie.key).to.be('guest_id');
                expect(cookie.value).to.be('v1:141105733211768497');
                cookie.value = 'test value';

                return Q.nbind(cookie_store.putCookie, cookie_store)(cookie);
            }).
            then(function() {
                /*
                var cookie_store2 = new FileCookieStore(COOKIES_TEST_FILE2);

                return Q.nbind(cookie_store2.findCookie, cookie_store2,'.twitter.com', '/', 'guest_id')();
                */
            }).
            then(function(cookie) {

                expect(cookie.key).to.be('guest_id');
                expect(cookie.value).to.be('test value');

                done();
            }).
            catch(function(err) {
                done(err);
            }).
            done();
        });
    });

    describe("#removeCookie", function () {

    });

    describe("#removeCookie", function () {

    });

    describe("#export", function () {

    });

});

var expect = require('expect.js'),
    Sequelize = require('sequelize'),
    TOUGH = require('tough-cookie2'),
    Q =     require('q'),
    DbCookieStore = require('../lib/store');

function randomStr () {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for( var i=0; i < 10; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length))
    return text;
}

function getDBStore () {
    return new DbCookieStore(DB_NAME, DB_USERNAME, DB_PASSWORD, DB_OPTIONS);
}

describe('Test db cookie store', function() { 
    var cookie_store, cookies_table_name;
    var PARALLEL_WRITES = 10;
    
    before(function() {         
        cookie_store = getDBStore();
        cookies_table_name = randomStr();
    });

    after(function (done) {
        if (typeof databaseClean == 'function') {
            databaseClean(function () {
                done();
            });
        } else {
            done();
        }
    });
    
    describe("#constructor", function () {
        it('should create object use db options', function (done) {            
            expect(cookie_store).to.be.ok();
            expect(cookie_store).to.be.a(DbCookieStore);

            cookie_store.findCookie('testdomain.com','/', 'key', function (err,cookie) {
                expect(err).not.to.be.ok();
                done();
            });
        });

        it('should create object use Sequalize object', function (done) {
            var table_name = randomStr();
                sequelize = new Sequelize(DB_NAME, DB_USERNAME, DB_PASSWORD, DB_OPTIONS),
                new_cookie_store = new DbCookieStore(sequelize, {
                    cookies_table : table_name
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
        var sequelize;

        beforeEach(function() { 
            sequelize = new Sequelize(DB_NAME, DB_USERNAME, DB_PASSWORD, DB_OPTIONS);
            cookie_store = new DbCookieStore(sequelize, {
                cookies_table : cookies_table_name
            });
        });

        afterEach(function(done){
            sequelize
                .getQueryInterface()
                .dropTable(cookies_table_name)
                .then(function () {
                    done();
                });
        });

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
                    var cookie_store = new getDBStore();
                    return Q.nbind(cookie_store.findCookies, cookie_store)(test_domain,null);
                })
                .then(function(cookies) {
                    expect(cookies).to.be.a(Array);
                    expect(cookies).to.have.length(PARALLEL_WRITES);
                    expect(cookies[0]).to.be.a(TOUGH.Cookie);
                
                    /*
                    var map_key_cookie = {};
                
                    cookies.forEach(function (cookie) {
                        map_key_cookie[cookie.key] = cookie;
                    });
                
                    keys.forEach(function (key) {
                        expect(map_key_cookie[key]).to.be.a(TOUGH.Cookie);
                    });
                
                    done();
                    */
                })
                .catch(function (err){
                    done(err);
                }).
                done();
        });
    });


    describe("#findCookie", function () {

    });


    describe("#findCookies", function () {

    });

    describe("#updateCookie", function () {

    });

    describe("#removeCookie", function () {

    });

    describe("#removeCookie", function () {

    });


});
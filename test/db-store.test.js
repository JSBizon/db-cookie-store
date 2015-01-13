var expect = require('expect.js'),
    Sequelize = require('sequelize'),
    TOUGH = require('tough-cookie2'),
    Q =     require('q');

function randomStr () {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for( var i=0; i < 10; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length))
    return text;
}

describe('Test db cookie store', function() { 
    var DbCookieStore, cookie_store;
    
    before(function() { 
        DbCookieStore = require('../lib/store');
        cookie_store = new DbCookieStore(DB_NAME, DB_USERNAME, DB_PASSWORD, DB_OPTIONS);
    });
    
    describe("#constructor", function () {
        it('should create object(db options)', function (done) {            
            expect(cookie_store).to.be.ok();
            expect(cookie_store).to.be.a(DbCookieStore);

            cookie_store.findCookie('testdomain.com','/', 'key', function (err,cookie) {
                expect(err).not.to.be.ok();
                done();
            });
        });

        it('should create object(Sequalize object)', function (done) {
            var table_name = randomStr();
                sequelize = new Sequelize(DB_NAME, DB_USERNAME, DB_PASSWORD, DB_OPTIONS),
                new_cookie_store = new DbCookieStore(sequalize, {
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
            cookie_store = new DbCookieStore(sequalize, {
                cookies_table : table_name
            });
        });

        afterEach(function(done){

        });

        it('it should put new cookie to db', function (done) {
            var domain = 'putcookie.test.com',
                path = '/',
                key = 'yurh%$^9jkjgf&^%$#@!*()',
                expire = new Date();
            
            expire.setDate(expire.getDate() + 2);
            
            var cookie = new TOUGH.Cookie({
                    domain : domain,
                    path : path,
                    secure : true,
                    expires : expire,
                    key : key,
                    value : '[]{}!@#$%%^&*()_+?',
                    httpOnly: true
            });

            Q.nbind(cookie_store.putCookie, cookie_store)(cookie).
                then(function () {
                    var findCookies = Q.nbind(cookie_store.findCookies, cookie_store2);
                    return findCookies(domain, null);
                }).
                catch(function (err) {
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
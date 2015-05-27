var Sequelize = require('sequelize');

DB_TEMPLATE_NAME = 'mysql';
DB_NAME = 'cookies_test';
DB_USERNAME = 'root';
DB_PASSWORD = '123';
DB_OPTIONS = {
    dialect : 'mysql',
    //port : '49155',
    logging: false,
    port : '3306',
    host: '127.0.0.1'
};

function getDb() {
    return new Sequelize(DB_TEMPLATE_NAME, DB_USERNAME, DB_PASSWORD, DB_OPTIONS);
}

databaseCreate = function(cb) {
    getDb().query("CREATE DATABASE IF NOT EXISTS " + DB_NAME).done(function() {
        cb();
    }).catch(function(error) {
        cb(error);
    });
}

databaseClean = function(cb) {
    getDb().query("DROP DATABASE IF EXISTS " + DB_NAME).done(function() {
        cb();
    }).catch(function(error) {
        cb(error);
    });
}

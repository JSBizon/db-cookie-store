var FS = require('fs');

var db_file = __dirname + '/cookies.sqlite';

DB_NAME = 'cookies';
DB_USERNAME = null;
DB_PASSWORD = null;
DB_OPTIONS = {
    dialect : 'sqlite',
    logging : false,
    storage: db_file
};

databaseCreate = function (cb) {
	cb();
}


databaseClean = function (cb) {
	try {
        FS.unlinkSync(db_file);
  	} catch (err) {};
	cb();
}





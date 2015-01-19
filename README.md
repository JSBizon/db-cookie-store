
# Introduction

db-cookie-store - this is database based store for cookie management library [tough cookie](https://github.com/goinstant/tough-cookie "tough cookie").
Library uses ORM [Sequelize](http://sequelizejs.com/ "sequalize") and allow store cookies in databases which are supported by sequelize: MySQL, MariaDB, SQLite, PostgreSQL. 

## Synopsis

``` javascript
var DBCookieStore = require('db-cookie-store');
/*
	note: it use tough-cookie2 by default, it's available for use with tough-cookie. tough-cookie2 is just fork of tough-cookie with different fixes
*/
var CookieJar = require("tough-cookie2").CookieJar; 
var jar = new CookieJar(new DBCookieStore(db_name, db_user, db_password, db_options));
```

## Installation
If you have npm installed, you can simply type:
          
          npm install db-cookie-store
          
Or you can clone this repository using the git command:

          git clone git://github.com/JSBizon/db-cookie-store.git





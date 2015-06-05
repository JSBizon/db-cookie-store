[![Build Status](https://travis-ci.org/JSBizon/db-cookie-store.svg?branch=master)](https://travis-ci.org/JSBizon/db-cookie-store)
# Introduction

db-cookie-store - this is database based store for cookie management library [tough cookie](https://github.com/goinstant/tough-cookie "tough cookie").
The library uses ORM [Sequelize](http://sequelizejs.com/ "sequalize") and allow store cookies in databases which are supported by sequelize: MySQL, MariaDB, SQLite, PostgreSQL.

## Synopsis

``` javascript
var DBCookieStore = require('db-cookie-store');
var CookieJar = require("tough-cookie").CookieJar;
var jar = new CookieJar(new DBCookieStore(db_name, db_user, db_password, db_options));
```

## Installation

If you have npm installed, you can simply type:

          npm install db-cookie-store

Or you can clone this repository using the git command:

          git clone git://github.com/JSBizon/db-cookie-store.git

## Usage

Class DbCookieStore has options:

  * cookies_model - pre-defined sequalize model for store cookies ( Default : _null_)
  * cookies_model_create - create table for store cookies if table doesn't exist ( Default : _true_)
  * cookies_table - name of table for store cookies ( Default : _cookies_ )
  * cookies_store_schema - name of pre-defined schema or object with fields for custom schema. There are several pre-defined schemes: _default_, _mozilla_, _chrome-win_. ( Default : _default_).
  * cookies_fields_map - map fields from cookie to the table. ( Default : _null_, it's dependent from store schema)
  * cookies_model_options - options parameter for creating cookies sequalize model. ( Default : _null_, it's dependent from store schema)
  * cookies_schema_init - this function will be called before create new cookies sequalize model. It must return promise.( Default : _null_, it's dependent from store schema)
  * transactions_queue - use transaction queue for insert and update sql queries. If value is true, requests will executed step by step. ( Default : _true_)

#### Store schema

Store schema describes how cookies data will be stored to the database. Store schema defines columns name and type. For example there are columns for _default_ schema:

```javascript
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
}
```

this means cookies attribute _key_ will be writed(or readed) to the column _key_ with type _TEXT_, cookies attribute _expires_ will be writed to the column _expires_ with type _INTEGER_, etc. Supported all options which supported by [sequalize define method](http://docs.sequelizejs.com/en/latest/api/sequelize/#definemodelname-attributes-options-model "sequalize define method").

There are exists next pre-defined schemas: _default_, _mozilla_, _chrome-win_.

You can define your own schema. Usually schema is a hash with fields: fields_map, options, init:

```javascript
var my_schema = {
  //sequalize fields description
  fields_map : {
  .....
  },
  //sequalize options
  options : {
    timestamps: false,
    indexes : [
      {fields : [{attribute : "domain", length : 25}]},
      {fields : [{attribute: "key", length : 25}, {attribute : "domain", length: 25},
      {attribute : "path", length: 25}] }
    ]
  },

  //should return Promise, will be called before model created
  init: function () {
    return new Sequelize.Promise(function (resolve, reject) {
        ......
      });
    }
  }
}
```

#### Export cookies

For receive all cookies from the store might be used method export:

``` javascript
cookie_store.export(function(cookies) {
  //cookies - array of cookies
});

cookie_store.export(new MemoryCookieStore(),function(memory_cookie_store) {
  //memory_cookie_store - instance of MemoryCookieStore
});
```

## Examples
Using this module with 'cookies_store_schema' parameter allow to read/write cookies from/to different cookies storages

#### Read/Write cookies from firefox cookies storage
Firefox uses Sqlite database for store cookies. So cookies could be readed and writed via CookieJar:

``` javascript
var DBCookieStore = require('db-cookie-store');
var CookieJar = require("tough-cookie").CookieJar;

var cookie_jar = new CookieJar(new DBCookieStore(null,null,null,{
    cookies_store_schema : 'mozilla', //use pre-defined fields set
    dialect : 'sqlite',
    storage: './cookies.sqlite',
}));
```


#### Read/Write cookies from chrome cookies storage(Linux)
Chrome uses uses Sqlite database for store cookies. Chrome for linux decode values of cookies. Encoding/decoding is implemented in chrome store schema:

``` javascript
var DBCookieStore = require('db-cookie-store');
var CookieJar = require("tough-cookie").CookieJar;
var chrome_schema = require('db-cookie-store/lib/chrome-linux-schema'); //load chrome schema

var cookie_jar = new CookieJar(new DBCookieStore(null,null,null,{
    cookies_store_schema : chrome_schema, //use loaded fieldset
    dialect : 'sqlite',
    storage: './Cookies',
}));
```

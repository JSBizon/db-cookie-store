"use strict";

var UTIL = require('util'),
    TOUGH = require('tough-cookie2');

function DbCookieStore(seq_instance) {
    
}

UTIL.inherits(DbCookieStore, TOUGH.Store);

DbCookieStore.prototype.synchronous = false;

DbCookieStore.prototype.findCookie = function(domain, path, key, cb) {
  throw new Error('findCookie is not implemented');
};

DbCookieStore.prototype.findCookies = function(domain, path, cb) {
  throw new Error('findCookies is not implemented');
};

Store.prototype.putCookie = function(cookie, cb) {
  throw new Error('putCookie is not implemented');
};

Store.prototype.updateCookie = function(oldCookie, newCookie, cb) {
  // recommended default implementation:
  // return this.putCookie(newCookie, cb);
  throw new Error('updateCookie is not implemented');
};

Store.prototype.removeCookie = function(domain, path, key, cb) {
  throw new Error('removeCookie is not implemented');
};

Store.prototype.removeCookies = function removeCookies(domain, path, cb) {
  throw new Error('removeCookies is not implemented');
};

module.exports = DbCookieStore;
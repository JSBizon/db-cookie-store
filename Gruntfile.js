module.exports = function(grunt) {

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-mocha-test');

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        jshint: {
            options: {
              node: true
            },
            main : ["lib/*.js"]
        },
        mochaTest: {
            sqlite_test : {
                options: {
                    reporter: 'spec',
                    require: 'test/sqlite-globals',
                    clearRequireCache: true
                },

                src: ['test/*.test.js']
            },

            mysql_test : {
                options: {
                    reporter: 'spec',
                    require: 'test/mysql-globals',
                    clearRequireCache: true
                },
                src: ['test/*.test.js']
            },

            pgsql_test : {
                options: {
                    reporter: 'spec',
                    clearRequireCache: true,
                    require: 'test/pgsql-globals'
                },
                src: ['test/*.test.js']
            }
            
        }
    });

    grunt.registerTask('default', ['jshint:main', 'mochaTest']);
};

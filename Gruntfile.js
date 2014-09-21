/* jshint node: true */
module.exports = function(grunt) {
    'use strict';

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        jshint: {
            files: ['Gruntfile.js', 'src/**/*.js', 'test/**/*.js'],
            options: {
                browser: true
            }
        },
        // Use shell command until jsdoc support gets to 3.3.0 (without Java)
        shell: {
            makeDocs: {
                //command: 'echo <%= grunt.file.expand("src/*.js").join(" ") %>',
                command: 'jsdoc -d doc src', // JSDoc doesn't support expansion
                options: {
                    stdout: true,
                    stderr: true
                }
            }
        },
        concat: {
            options: {
                separator: '\n',
                banner: '/*! <%= pkg.name %> <%= pkg.version %>, (c) <%= pkg.author %>. ' +
                    'Licensed under <%= pkg.license %>, see <%= pkg.homepage %> for details. */\n'
            },
            dist: {
                src: [ 'src/jgoinit.js', 'src/*.js' ],
                dest: 'dist/<%= pkg.name %>-<%= pkg.version %>.js',
            }
        },
        uglify: {
            options: {
                banner: '<%= concat.options.banner %>'
            },
            dist: {
                files: {
                    'dist/<%= pkg.name %>-<%= pkg.version %>.min.js': ['<%= concat.dist.dest %>']
                }
            }
        },
        copy: {
            main: {
                src: 'dist/<%= pkg.name %>-<%= pkg.version %>.js',
                dest: 'dist/<%= pkg.name %>-latest.js'
            }
        }
    });

    // Load the plugin that provides the "uglify" task.
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-copy');
    //grunt.loadNpmTasks('grunt-jsdoc');
    grunt.loadNpmTasks('grunt-shell');

    // Default task(s).
    grunt.registerTask('default', ['jshint', 'concat', 'uglify', 'copy']);

};

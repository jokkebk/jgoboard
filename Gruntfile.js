module.exports = function(grunt) {
    'use strict';

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        jshint: {
            files: ['gruntfile.js', 'src/**/*.js', 'test/**/*.js'],
            options: {
                jshintrc: true
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
                separator: '\n'
            },
            dist: {
                src: [ 'src/jgoinit.js', 'src/*.js' ],
                dest: 'dist/<%= pkg.name %>-<%= pkg.version %>.js',
            }
        },
        uglify: {
            options: {
                // the banner is inserted at the top of the output
                banner: '/*! <%= pkg.name %> <%= grunt.template.today("dd-mm-yyyy") %> */\n'
            },
            dist: {
                files: {
                    'dist/<%= pkg.name %>-<%= pkg.version %>.min.js': ['<%= concat.dist.dest %>']
                }
            }
        }
    });

    // Load the plugin that provides the "uglify" task.
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    //grunt.loadNpmTasks('grunt-jsdoc');
    grunt.loadNpmTasks('grunt-shell');

    // Default task(s).
    grunt.registerTask('default', ['jshint', 'concat', 'uglify']);

};

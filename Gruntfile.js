module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        jshint: {
            files: ['gruntfile.js', 'src/**/*.js', 'test/**/*.js'],
            options: {
                globals: {
                }
            }
        },
        //jsdoc: {
        //    dist: {
        //        src: ['src/*.js', 'test/*.js'],
        //        options: {
        //            destination: 'doc'
        //        }
        //    }
        //},
        // Use shell command until jsdoc support gets to 3.3.0 (without Java)
        shell: {
            makeDocs: {
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
                //src: [ 'src/jgoinit.js', 'src/jgoconstants.js', 'src/jgocoordinate.js',
                    //    'src/jgoboard.js', 'src/jgocanvas.js', 'src/jgonotifier.js',
                    //    'src/jgosetup.js', 'src/jgonode.js', 'src/jgorecord.js', 'src/jgoutil.js',
                    src: [ 'src/jgoinit.js', 'src/*.js' ],
                    dest: 'dist/<%= pkg.name %>-<%= pkg.version %>.js',
            },
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

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
    grunt.loadNpmTasks('grunt-jsdoc');

    // Default task(s).
    grunt.registerTask('default', ['jshint', /*'jsdoc',*/ 'concat', 'uglify']);

};

module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        concat: {
            options: {
                separator: '\n'
            },
            dist: {
                src: [ 'src/jgoinit.js', 'src/jgoconstants.js', 'src/jgocoordinate.js',
                    'src/jgoboard.js', 'src/jgocanvas.js', 'src/jgonotifier.js',
                    'src/jgosetup.js', 'src/jgonode.js', 'src/jgorecord.js', 'src/jgoutil.js',
                    'src/jgosgf.js', 'large/board.js' ],
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

    // Default task(s).
    grunt.registerTask('default', ['concat', 'uglify']);

};

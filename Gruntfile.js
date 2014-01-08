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
        //uglify: {
            //  options: {
                //    banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
                //  },
                //  build: {
                    //    src: 'src/<%= pkg.name %>.js',
                    //    dest: 'build/<%= pkg.name %>.min.js'
                    //  }
                    //}
    });

    // Load the plugin that provides the "uglify" task.
    grunt.loadNpmTasks('grunt-contrib-concat');

    // Default task(s).
    grunt.registerTask('default', ['concat']);

};

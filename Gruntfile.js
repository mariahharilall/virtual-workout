module.exports = function(grunt) {
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.initConfig({
        jshint: {
            all: ['Gruntfile.js','*.js'],
            options: {
                'esversion': 6,
            }
        },
        watch: {
            files: ['Gruntfile.js','*.js'],
            tasks: ['jshint']
        }
    });
};

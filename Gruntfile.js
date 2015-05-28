'use strict';

module.exports = function(grunt) {
  grunt.loadNpmTasks('grunt-contrib-jshint');

  // Project configuration.
  grunt.initConfig({
    jshint: {
      gruntfile: {
        src: 'Gruntfile.js'
      },
      lib: {
        src: ['js/**/*.js']
      },
    options: {
      curly: true,
      eqeqeq: true,
      eqnull: true,
      node: true,
      funcscope: true
    },
    watch: {
      gruntfile: {
        tasks: ['jshint:gruntfile']
      },
      lib: {
        files: '<%= jshint.lib.src %>',
        tasks: ['jshint:lib', 'nodeunit']
      }
    }
    }
  });

  // Default task.
  grunt.registerTask('default', ['jshint']);

};

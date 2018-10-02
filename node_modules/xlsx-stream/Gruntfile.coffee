module.exports = (grunt) ->
  @loadNpmTasks('grunt-contrib-clean')
  @loadNpmTasks('grunt-contrib-coffee')
  @loadNpmTasks('grunt-contrib-watch')
  @loadNpmTasks('grunt-mkdir')
  @loadNpmTasks('grunt-release')
  @loadNpmTasks('grunt-vows-runner')

  @initConfig
    coffee:
      all:
        options:
          bare: true
        expand: true,
        cwd: 'src',
        src: ['*.coffee'],
        dest: 'lib',
        ext: '.js'

    clean:
      all: ['lib', 'tmp']

    mkdir:
      all:
        options:
          create: ['tmp']

    watch:
      all:
        files: ['src/**.coffee', 'test/**.coffee']
        tasks: ['test']

    vows:
      all:
        src: 'test/test.coffee'
        options:
          reporter: 'spec'


  @registerTask 'default', ['test']
  @registerTask 'build', ['clean', 'coffee']
  @registerTask 'package', ['build', 'release']
  @registerTask 'test', ['build', 'mkdir', 'vows']

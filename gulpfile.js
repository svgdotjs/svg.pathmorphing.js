var del     = require('del')
  , gulp    = require('gulp')
  , header  = require('gulp-header')
  , iife    = require('gulp-iife')
  , rename  = require('gulp-rename')
  , stand   = require('gulp-standard')
  , trim    = require('gulp-trimlines')
  , uglify  = require('gulp-uglify')
  , pkg     = require('./package.json')


var headerLong = ['/*!'
  , '* <%= pkg.name %> - <%= pkg.description %>'
  , '* @version <%= pkg.version %>'
  , '* <%= pkg.homepage %>'
  , '*'
  , '* @copyright (c) '+(new Date().getFullYear())+' <%= pkg.author %>'
  , '* @license <%= pkg.license %>'
  , '*/;'
  , ''].join('\n')

var headerShort = '/*! <%= pkg.name %> v<%= pkg.version %> <%= pkg.license %>*/;'

gulp.task('clean', function() {
  return del([ 'dist/*' ])
})

gulp.task('copyJS', ['clean'], function() {
  return gulp.src('src/svg.pathmorphing.js')
    .pipe(iife())
    .pipe(header(headerLong, { pkg: pkg }))
    .pipe(trim({ leading: false }))
    .pipe(gulp.dest('dist'))
})

gulp.task('copy', ['copyJS'])


/**
 ‎* uglify the file
 * add the license info
 */
gulp.task('minifyJS', ['copy'], function() {
  return gulp.src('dist/svg.pathmorphing.js')
    .pipe(uglify())
    .pipe(rename({ suffix:'.min' }))
    .pipe(header(headerShort, { pkg: pkg }))
    .pipe(gulp.dest('dist'))
})

gulp.task('minify', ['minifyJS'])


gulp.task('standard', function () {
  return gulp.src(['./svg.pathmorphing.js'])
    .pipe(stand())
    .pipe(stand.reporter('default', {
      breakOnError: true,
      quiet: false
    }))
})


gulp.task('default', ['standard', 'clean', 'copy', 'minify'])
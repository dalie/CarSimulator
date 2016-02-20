var gulp = require('gulp');
var del = require('del');
var deploy = require('gulp-gh-pages');

/**
 * Push build to gh-pages
 */
gulp.task('deploy', ['build'], function () {
    return gulp.src('./dist/**/*')
      .pipe(deploy())
});

gulp.task('clean', function () {
    return del([
      './dist/**/*'
    ]);
});

gulp.task('build', function () {
    return gulp.src([
        '!node_modules/**/*',
        '**/index.html',
        '**/app.css',
        '**/*.js',
        '**/assets/**/*',
        '**/bower_components/three.js/build/**/*',
        '**/bower_components/three.js/examples/js/loaders/**/*'

    ])
        .pipe(gulp.dest('./dist/'));
});
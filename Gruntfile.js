module.exports = function(grunt) {
    var user = require('./config/user.json');

    grunt.loadNpmTasks('grunt-screenshot');

    grunt.initConfig({
        screenshot: {
            '404': {
                options: {
                    path: './screenshots/404',
                    files: [{
                        parallel: true,
                        compress: true,
                        type: 'remote',
                        src: "http://what.localhost:1337",
                        dest: "404.png",
                        delay: 1000
                    }],
                    viewport: ['1920x1080', '1024x768', '640x960', '320x480']
                }
            },
            'admin-application-list': {
                options: {
                    path: './screenshots/admin/application-list',
                    files: [{
                        parallel: true,
                        compress: true,
                        type: 'remote',
                        src: "http://admin.localhost:1337/",
                        dest: "application-list.png",
                        delay: 4000,
                        basicAuth: {
                            username: user.username,
                            password: user.password
                        }
                    }],
                    viewport: ['1920x1080', '1024x768', '640x960', '320x480']
                }
            },
            'admin-application': {
                options: {
                    path: './screenshots/admin/application',
                    files: [{
                        parallel: true,
                        compress: true,
                        type: 'remote',
                        src: "http://admin.localhost:1337/application/main-app",
                        dest: "application.png",
                        delay: 5000,
                        basicAuth: {
                            username: user.username,
                            password: user.password
                        }
                    }],
                    viewport: ['1920x1080', '1024x768', '640x960', '320x480']
                }
            },
            'admin-settings': {
                options: {
                    path: './screenshots/admin/settings',
                    files: [{
                        parallel: true,
                        compress: true,
                        type: 'remote',
                        src: "http://admin.localhost:1337/settings",
                        dest: "settings.png",
                        delay: 4000,
                        basicAuth: {
                            username: user.username,
                            password: user.password
                        }
                    }],
                    viewport: ['1920x1080', '1024x768', '640x960', '320x480']
                }
            }
        }
    });
    grunt.registerTask('default', ['screenshot']);
};

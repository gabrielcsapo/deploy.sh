module.exports = function(grunt) {
    var user = require('./config/user.json');

    grunt.loadNpmTasks('grunt-screenshot');

    grunt.initConfig({
        screenshot: {
            '404': {
                options: {
                    path: './screenshots/404',
                    files: [{
                        type: 'remote',
                        src: "http://what.dev:1337",
                        dest: "404.png",
                        delay: 1000
                    }],
                    viewport: ['1920x1080', '1024x768', '640x960', '320x480']
                }
            },
            admin: {
                options: {
                    path: './screenshots/admin',
                    files: [{
                        type: 'remote',
                        src: "http://admin.dev:1337",
                        dest: "admin.png",
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

};

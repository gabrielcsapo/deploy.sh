(function() {
    'use strict';
    require('./dist/admin.css');

    var Vue = require('vue');

    var create = function(defaultRoute) {
        var routes = {
            '^(?:/(?=$))?$': require('./views/application-list.vue'),
            '^/application/((?:[^/]+?))(?:/(?=$))?$': require('./views/application-view.vue'),
            '404': require('./views/404.vue')
        };

        var route;
        Object.keys(routes).forEach(function(reg) {
            if (new RegExp(reg, 'i').test(defaultRoute || window.location.pathname)) {
                route = reg;
            }
        });
        return new Vue(routes[route] || routes['404']);
    };

    create().$mount('#app');
}).call(this);

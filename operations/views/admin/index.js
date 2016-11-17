/* global io */
(function() {
    'use strict'
    var moment = require('moment');
    var Vue = require('vue');
    if (typeof window !== 'undefined') {
        var Chart = require('chart.js');

        /**
         * fetch
         * gets data from endpoint
         * @param  {string}   url      the relative url
         * @param  {Function} callback function(response)
         */
        var fetch = function(url, callback) {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", url, true);
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4 && xhr.status == 200) {
                    callback(JSON.parse(xhr.responseText));
                }
            }
            xhr.send();
        }

        /**
         * post
         * @param  {string}   url      relative url to post to
         * @param  {object}   body     json object
         * @param  {Function} callback funtion(status, response)
         */
        var post = function(url, body, callback) {
            var xhr = new XMLHttpRequest();
            xhr.open("POST", url);
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4) {
                    callback(xhr.status, xhr.responseText)
                }
            }
            xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
            xhr.send(JSON.stringify(body));
        }
    }

    var createApp = function(defaultRoute) {
        var routes = {
            '^(?:/(?=$))?$': {
                template: `<div id="app">
                    <small v-if="Object.keys(processes).length == 0" style="height:100px;" class="vertical-center"> Currently no applications are running :( </small>
                    <ul v-else class="list">
                      <li class="list-item" v-for="process in processes">
                        <div class="list-item-left">
                            <a :href="'/application/' + process.name"> {{ process.name }} </a>
                        </div>
                        <div class="list-item-right">
                            {{ process.cpu[process.cpu - 1] ? process.cpu[process.cpu - 1][1] : 0 }}%
                            -
                            {{ formatSize(process.memory[process.memory.length - 1] ? process.memory[process.memory.length - 1][1] : 0) }}
                        </div>
                      </li>
                    </ul>
                </div>`,
                data: {
                    processes: {}
                },
                created: function() {
                    var self = this;
                    if (typeof window !== 'undefined') {
                        var socket = io.connect('/');
                        fetch('/api/process/json', function(processes) {
                            self.processes = processes;

                            self.processes.forEach(function(process, i) {
                              socket.on(process.name + '-memory', function(data) {
                                self.processes[i].cpu.push(data.cpu);
                                self.processes[i].memory.push(data.memory);
                              });
                            });
                        });
                    }
                },
                methods: {
                    formatSize: function(bytes) {
                        if (bytes == 0) return '0 B';
                        var sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
                        var i = Math.floor(Math.log(bytes) / Math.log(1000));
                        return parseFloat((bytes / Math.pow(1000, i)).toFixed(3)) + ' ' + sizes[i];
                    }
                }
            },
            '^/application/((?:[^/]+?))(?:/(?=$))?$': {
                template: `<div id="app">
                    <div class="grid">
                        <div class="col-12-12">
                            <div v-if="error" class="alert alert-danger" style="border-radius:5px;"> {{ error }} </div>
                            <div v-if="info" class="alert alert-info" style="border-radius:5px;"> {{ info }} </div>
                        </div>

                        <div class="col-3-12 text-left">
                            <a class="btn border-info" href='/' style="margin-left:0;"> Back </a>
                        </div>
                        <div class="col-6-12"> <h2><a :href="url"> {{ name }}</h2> </div>
                        <div class="col-3-12 text-right">
                            <button v-if="deployed" v-on:click="redeploy" class="btn border-primary" style="margin-right:0;">Redeploy</button>
                            <button v-else class="btn border-primary"> <div class="spinner spinner-primary" style="margin-right:0;"></div> </button>
                        </div>

                        <div class="col-12-12">
                            <h3>repo info</h3>
                            <div v-if="editable" class="grid">
                                <div class="col-1-12 text-left">
                                    <a class="btn border-warning" @click="editCancel" style="margin-left:0;"> Cancel </a>
                                </div>
                                <div class="col-8-12"></div>
                                <div class="col-3-12 text-right">
                                    <button v-if="editingLoading" class="btn border-info" style="margin-right:0;"> <div class="spinner spinner-primary"></div> </button>
                                    <a v-else class="btn border-info" @click="editSave" style="margin-right:0;"> Save </a>
                                </div>
                                <textarea class="col-12-12 text-left" style="height:400px;padding:0;" @input="editKeydown"> {{ JSON.stringify(config, null, 4) }} </texarea>
                            </div>
                            <div v-else class="grid">
                                <div class="col-10-12"></div>
                                <div class="col-2-12 text-right">
                                    <a class="btn border-primary" @click="editStart" style="margin-right:0;"> Edit </a>
                                </div>
                                <div class="col-12-12">
                                    <pre style="text-align:left;">{{ JSON.stringify(config, null, 4) }}</pre>
                                </div>
                            </div>
                        </div>

                        <div class="col-12-12">
                            <h3>repo instructions</h3>
                            <p> To push to the remote repo please copy the following upstream </p>
                            <pre> git remote add upstream {{ remoteUpstream }} </pre>
                        </div>

                        <div class="col-12-12">
                            <h3>memory <small>~ {{ formatSize(currentMemory) }}</small></h3>
                            <canvas id="chart-memory"></canvas>
                        </div>

                        <div class="col-12-12">
                            <h3>traffic <small>{{ traffic.map(function(t) { return t.traffic.length; }).reduce(function(a, b) { return a + b }, 0) }}</small></h3>
                            <canvas id="chart-traffic"></canvas>
                        </div>

                        <div class="col-12-12">
                            <h3>countries <small>{{ Object.keys(countries).length }}</small></h3>
                            <canvas id="chart-countries"></canvas>
                        </div>

                        <div class="col-12-12">
                            <h3>referrers <small>{{ Object.keys(referrers).length }}</small></h3>
                            <canvas id="chart-referrers"></canvas>
                        </div>

                        <div class="col-12-12">
                            <h3>logs <small>{{ logs.length }}</small></h3>
                            <pre class="process-logs" id="log-view">{{ readableLogs }}</pre>
                        </div>
                    </div>
                </div>`,
                data: {
                    traffic: [],
                    memory: [],
                    currentMemory: 0,
                    cpu: [],
                    logs: [],
                    readableLogs: '',
                    referrers: {},
                    countries: {},
                    name: '',
                    url: '',
                    remoteUpstream: '',
                    error: '',
                    info: '',
                    deployed: true,
                    editingLoading: false,
                    editable: false,
                    config: {},
                    charts: {
                        memoryChart: {},
                        trafficChart: {},
                        countriesChart: {},
                        refferChart: {},
                    }
                },
                methods: {
                    redeploy: function() {
                        var self = this;
                        self.deployed = false;
                        fetch('/api/process/' + this.name + '/redeploy', function(response) {
                            if (response.success) {
                                self.deployed = true;
                            }
                        });
                    },
                    editStart: function() {
                        this.editable = true;
                    },
                    editCancel: function() {
                        this.editable = false;
                    },
                    editSave: function() {
                        var self = this;
                        self.editingLoading = true;
                        self.info = 'saving config, restarting app...';
                        post('/api/process/' + self.name + '/settings', self.config, function(status, response) {
                            if(status === 200) {
                                self.url = window.location.protocol + '//' + (self.config.subdomain === '*' ? window.location.host.replace('admin.', '') : window.location.host.replace('admin', self.config.subdomain));
                                self.remoteUpstream = window.location.protocol + '//' + self.config.users[0].user.username + ':' + self.config.users[0].user.password + '@' + window.location.hostname.replace('admin.', '') + ':7000/' + self.config.name + '.git';
                                self.info = response.success;
                                setTimeout(function() {
                                    self.info = '';
                                }, 1000);
                            } else {
                                self.error = response.error;
                            }
                            self.editable = false;
                            self.editingLoading = false;
                        });
                    },
                    editKeydown: function(e) {
                        var self = this;
                        try {
                            var json = JSON.parse(e.target.value);
                            self.config = json;
                            self.error = '';
                        } catch(e) {
                            self.error = 'error parsing config changes';
                        }
                    },
                    formatSize: function(bytes) {
                        if (bytes == 0) return '0 B';
                        var sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
                        var i = Math.floor(Math.log(bytes) / Math.log(1000));
                        return parseFloat((bytes / Math.pow(1000, i)).toFixed(3)) + ' ' + sizes[i];
                    },
                    dynamicColors: function(i) {
                        var hex = ((i / 20 || Math.random()) * 0xFFFFFF << 0).toString(16);
                        var r = parseInt(hex.substring(0, 2), 16);
                        var g = parseInt(hex.substring(2, 4), 16);
                        var b = parseInt(hex.substring(4, 6), 16);

                        return 'rgba(' + r + ',' + g + ',' + b + ', 1)';
                    },
                    formatCountryandReffererData: function() {
                        var self = this;
                        self.countries = {};
                        self.referrers = {};
                        self.traffic.forEach(function(t) {
                            t.traffic.forEach(function(v) {
                                // Get the country data
                                if (v[2]) {
                                    self.countries[v[2].country] = !self.countries[v[2].country] ? 1 : self.countries[v[2].country] + 1;
                                }
                                // Get the referrer data
                                if (v[3]) {
                                    self.referrers[v[3]] = !self.referrers[v[3]] ? 1 : self.referrers[v[3]] + 1;
                                }
                            })
                        });
                    },
                    getMemoryChartData: function() {
                        return this.memory.map(function(m) {
                            return {
                                x: m[0],
                                y: m[1]
                            }
                        }, []);
                    },
                    getCPUChartData: function() {
                        return this.cpu.map(function(m) {
                            return {
                                x: m[0],
                                y: m[1]
                            }
                        }, []);
                    },
                    getTrafficChartData: function() {
                        var self = this;
                        return self.traffic.map(function(b, i) {
                            var color = self.dynamicColors((i + 1));
                            return {
                                label: b.url,
                                borderColor: color,
                                backgroundColor: 'transparent',
                                data: b.traffic.map(function(t) {
                                    return {
                                        x: t[0],
                                        y: t[1]
                                    }
                                })
                            }
                        }, []);
                    },
                    getReffererChartData: function() {
                        var self = this;
                        return {
                            labels: Object.keys(self.referrers),
                            datasets: [{
                                label: 'Refferer Traffic',
                                data: Object.keys(self.referrers).map(function(k) {
                                    return self.referrers[k]
                                })
                            }]
                        }
                    },
                    getCountryChartData: function() {
                        var self = this;
                        return {
                            labels: Object.keys(self.countries),
                            datasets: [{
                                label: 'Country Traffic',
                                data: Object.keys(self.countries).map(function(k) {
                                    return self.countries[k]
                                })
                            }]
                        }
                    },
                    createCharts: function() {
                        var self = this;
                        self.formatCountryandReffererData();

                        self.charts.memoryChart = new Chart(document.getElementById('chart-memory'), {
                            type: 'line',
                            data: {
                                datasets: [{
                                    label: 'Memory',
                                    borderColor: self.dynamicColors(1),
                                    backgroundColor: 'transparent',
                                    data: self.getMemoryChartData()
                                }, {
                                    label: 'CPU',
                                    borderColor: self.dynamicColors(2),
                                    backgroundColor: 'transparent',
                                    data: self.getCPUChartData()
                                }]
                            },
                            options: {
                                tooltips: {
                                    callbacks: {
                                        title: function(tooltipItem) {
                                            // If this is the memory dataset convert to memory units
                                            if (tooltipItem[0].datasetIndex == 0) {
                                                return self.formatSize(tooltipItem[0].yLabel);
                                            } else {
                                                return tooltipItem[0].yLabel + '%';
                                            }
                                        },
                                        label: function(tooltipItem, data) {
                                            return moment(data.xLabel).format()
                                        }
                                    }
                                },
                                scales: {
                                    yAxes: [{
                                        ticks: {
                                            beginAtZero: true,
                                            callback: function(value) {
                                                return self.formatSize(value);
                                            }
                                        }
                                    }],
                                    xAxes: [{
                                        type: 'linear',
                                        position: 'bottom',
                                        ticks: {
                                            callback: function(value) {
                                                return moment(value).format('h:mm:ss a');
                                            }
                                        }
                                    }]
                                }
                            }
                        });

                        self.charts.trafficChart = new Chart(document.getElementById('chart-traffic'), {
                            type: 'line',
                            data: {
                                datasets: self.getTrafficChartData()
                            },
                            options: {
                                tooltips: {
                                    callbacks: {
                                        title: function(tooltipItem, data) {
                                            return data.datasets[tooltipItem[0].datasetIndex].label + '\n' + tooltipItem[0].yLabel + 'ms';
                                        },
                                        label: function(tooltipItem, data) {
                                            return moment(data.xLabel).format()
                                        }
                                    }
                                },
                                scales: {
                                    yAxes: [{
                                        ticks: {
                                            beginAtZero: true,
                                            callback: function(value) {
                                                return value;
                                            }
                                        }
                                    }],
                                    xAxes: [{
                                        type: 'linear',
                                        position: 'bottom',
                                        ticks: {
                                            callback: function(value) {
                                                return moment(value).format('h:mm:ss a');
                                            }
                                        }
                                    }]
                                }
                            }
                        });


                        self.charts.countriesChart = new Chart(document.getElementById('chart-countries'), {
                            type: 'bar',
                            data: self.getCountryChartData(),
                            options: {
                                scales: {
                                    yAxes: [{
                                        ticks: {
                                            beginAtZero: true
                                        }
                                    }]
                                }
                            }
                        });

                        self.charts.refferChart = new Chart(document.getElementById('chart-referrers'), {
                            type: 'bar',
                            data: self.getReffererChartData(),
                            options: {
                                scales: {
                                    yAxes: [{
                                        ticks: {
                                            beginAtZero: true
                                        }
                                    }]
                                }
                            }
                        });
                    },
                    updateCharts: function() {
                        var self = this;

                        self.charts.trafficChart.data.datasets = self.getTrafficChartData();
                        self.charts.memoryChart.data.datasets[0].data = self.getMemoryChartData();
                        self.charts.memoryChart.data.datasets[1].data = self.getCPUChartData();

                        self.formatCountryandReffererData();
                        self.charts.countriesChart.data.labels = self.getCountryChartData().labels;
                        self.charts.countriesChart.data.datasets = self.getCountryChartData().datasets;
                        self.charts.refferChart.data.labels = self.getReffererChartData().labels;
                        self.charts.refferChart.data.datasets = self.getReffererChartData().datasets;

                        self.charts.trafficChart.update(0, true);
                        self.charts.memoryChart.update(0, true);
                        self.charts.countriesChart.update(0, true);
                        self.charts.refferChart.update(0, true);
                    },
                },
                updated: function() {
                    var elem = document.getElementById('log-view');
                    elem.scrollTop = elem.scrollHeight;
                },
                created: function() {
                    var self = this;
                    var application = new RegExp('^/application/((?:[^/]+?))(?:/(?=$))?$', 'i').exec(defaultRoute || window.location.pathname)[1];
                    if (typeof window !== 'undefined') {
                        var socket = io.connect('/');
                        socket.on(application + '-logs', function(data) {
                            self.logs.push(data);
                        });
                        socket.on(application + '-traffic', function(data) {
                            var found = false;
                            self.traffic.forEach(function(route) {
                                if (route.url === data.url) {
                                    found = true;
                                    route.traffic.push(data.traffic[0]);
                                }
                            });
                            if(!found) {
                              // This is the start of a new route
                              // Add it and move on
                              self.traffic.push(data);
                            }
                            self.updateCharts();
                        });
                        socket.on(application + '-memory', function(data) {
                            self.cpu.push(data.cpu);
                            self.memory.push(data.memory);
                            self.currentMemory = Array.isArray(self.memory) && self.memory[0] && self.memory[0].length > 0 ? self.memory[self.memory.length - 1][1] || 0 : 0;
                            self.updateCharts();
                        });
                        fetch('/api/process/' + application + '/json', function(response) {
                            self.name = application;
                            self.config = response.repo;
                            self.logs = response.logs;
                            self.readableLogs = response.logs.join('\n');
                            self.cpu = response.cpu;
                            self.memory = response.memory;
                            self.traffic = response.traffic;

                            self.url = window.location.protocol + '//' + (self.config.subdomain === '*' ? window.location.host.replace('admin.', '') : window.location.host.replace('admin', self.config.subdomain));
                            self.remoteUpstream = window.location.protocol + '//' + self.config.users[0].user.username + ':' + self.config.users[0].user.password + '@' + window.location.hostname.replace('admin.', '') + ':7000/' + self.config.name + '.git';

                            self.createCharts();
                        });
                    }
                }
            },
            '404': {
                template: `<div id="app">
                    <pre style="width:425px;height:300px;" class="vertical-center background-black text-white">
                        <h3> This page does not exist </h3>
                        <h1> 404 </h1>
                        <a href="/" class="text-white" style="display:block;"> Go back to somewhere safe </a>
                    </pre>
                </div>`
            }
        }
        var route;
        Object.keys(routes).forEach(function(reg) {
            if (new RegExp(reg, 'i').test(defaultRoute || window.location.pathname)) {
                route = reg;
            }
        });
        return new Vue(routes[route] || routes['404']);
    }
    if (typeof module !== 'undefined' && module.exports && typeof window === 'undefined') {
        module.exports = createApp;
    } else {
        createApp().$mount('#app');
    }
}).call(this)

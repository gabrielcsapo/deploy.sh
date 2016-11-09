(function() {
    'use strict'
    var moment = require('moment');
    var Vue = require('vue');
    if(typeof window !== 'undefined') {
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
    }

    var createApp = function(defaultRoute) {
        var routes = {
            '^(?:/(?=$))?$': {
                template: `<div id="app">
                    <small v-if="Object.keys(processes).length == 0" style="height:100px;" class="vertical-center"> Currently no applications are running :( </small>
                    <ul v-else class="list">
                      <li class="list-item" v-for="process in Object.keys(processes)">
                        <div class="list-item-left">
                            <a :href="'/application/' + process"> {{ process }} </a>
                        </div>
                        <div class="list-item-right">
                            {{ processes[process].cpu[0] ? processes[process].cpu[0][1] : 0 }}%
                            -
                            {{ formatSize(processes[process].memory[0] ? processes[process].memory[0][1] : 0) }}
                        </div>
                      </li>
                    </ul>
                </div>`,
                data: {
                    processes: {}
                },
                created: function() {
                  var self = this;
                  if(typeof window !== 'undefined') {
                      fetch('/process/json', function(processes) {
                          self.processes = processes;
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
            '^/settings(?:/(?=$))?$': {
                template: `<div id="app">
                    <div class="text-center panel panel-default">
                        <div class="panel-header"> Config </div>
                        <div class="panel-body">
                         <textarea id="config-data">{{ JSON.stringify(config, null, 4) }}</textarea>
                        </div>
                        <div class="panel-footer text-right">
                            <button @click="update" class="btn btn-primary" id="btn-update"> Update </button>
                        </div>
                    </div>
                </div>`,
                data: {
                    config: {}
                },
                methods: {
                    update: function() {
                        try {
                            var config = JSON.stringify(JSON.parse(document.getElementById('config-data').value));
                            var xhr = new XMLHttpRequest();
                            xhr.open("POST", "/settings");
                            document.getElementById("btn-update").innerHTML = '<div class="spinner spinner-white"></div>';
                            xhr.onreadystatechange = function() {
                                if (xhr.readyState == 4 && xhr.status == 200) {
                                    document.getElementById("btn-update").innerHTML = 'Updated!';
                                    setTimeout(function() {
                                        document.getElementById("btn-update").innerHTML = 'Update';
                                    }, 2000)
                                }
                            }
                            xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
                            xhr.send(config);
                        } catch(ex) {
                            document.getElementById("btn-update").classList.remove('btn-primary')
                            document.getElementById("btn-update").classList.add('btn-warning')
                            document.getElementById("btn-update").innerHTML = 'Malformed JSON';
                            setTimeout(function() {
                                document.getElementById("btn-update").classList.remove('btn-warning')
                                document.getElementById("btn-update").classList.add('btn-primary')
                                document.getElementById("btn-update").innerHTML = 'Update';
                            }, 2000)
                        }
                    }
                },
                created: function() {
                    var self = this;
                    if(typeof window !== 'undefined') {
                        fetch('/config/json', function(data) {
                            self.config = data;
                        });
                    }
                }
            },
            '^/application/((?:[^/]+?))(?:/(?=$))?$': {
                template: `<div id="app">
                    <div class="grid">
                        <div class="col-1-12">
                            <a class="btn border-info" href='/'> Back </a>
                        </div>
                        <div class="col-10-12"> <h2>{{ name }}</h2> </div>
                        <div class="col-1-12">
                            <button v-if="deployed" v-on:click="redeploy" class="btn border-primary">Redeploy</button>
                            <button v-else class="btn border-primary"> <div class="spinner spinner-primary"></div> </button>
                        </div>

                        <div class="col-12-12">
                            <h3>repo info</h3>
                            <pre style="text-align:left;">{{ JSON.stringify(config, null, 4) }}</pre>
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
                            <pre class="process-logs">{{ logs.join('\\n') }}</pre>
                        </div>
                    </div>
                </div>`,
                data: {
                    traffic: [],
                    memory: [],
                    currentMemory: 0,
                    cpu: [],
                    logs: [],
                    referrers: {},
                    countries: {},
                    name: '',
                    deployed: true,
                    config: {},
                    charts: {
                        memoryChart: {}
                    }
                },
                methods: {
                    redeploy: function() {
                        var self = this;
                        self.deployed = false;
                        fetch('/process/' + this.name + '/redeploy', function(response) {
                            if (response.success) {
                                self.deployed = true;
                            }
                        });
                    },
                    formatSize: function(bytes) {
                        if (bytes == 0) return '0 B';
                        var sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
                        var i = Math.floor(Math.log(bytes) / Math.log(1000));
                        return parseFloat((bytes / Math.pow(1000, i)).toFixed(3)) + ' ' + sizes[i];
                    }
                },
                created: function() {
                    var self = this;
                    var application = new RegExp('^/application/((?:[^/]+?))(?:/(?=$))?$', 'i').exec(defaultRoute || window.location.pathname)[1];
                    if(typeof window !== 'undefined') {
                        fetch('/process/' + application + '/json', function(response) {
                            var dynamicColors = function() {
                                var r = Math.floor(Math.random() * 255);
                                var g = Math.floor(Math.random() * 255);
                                var b = Math.floor(Math.random() * 255);
                                return "rgb(" + r + "," + g + "," + b + ")";
                            }
                            self.name = application;
                            self.config = response.repo;
                            self.logs = response.logs;
                            self.cpu = response.cpu;
                            self.memory = response.memory;
                            self.traffic = response.traffic;

                            self.currentMemory = Array.isArray(self.memory) && self.memory[0] && self.memory[0].length > 0 ? self.memory[self.memory.length - 1][1] || 0 : 0;

                            self.charts.memoryChart = new Chart(document.getElementById('chart-memory'), {
                                type: 'line',
                                data: {
                                    datasets: [{
                                        label: 'Memory',
                                        borderColor: dynamicColors(),
                                        backgroundColor: 'rgba(218, 218, 218, 0.2)',
                                        data: self.memory.map(function(m) {
                                            return {
                                                x: m[0],
                                                y: m[1]
                                            }
                                        }, [])
                                    },{
                                        label: 'CPU',
                                        borderColor: dynamicColors(),
                                        backgroundColor: 'rgba(218, 218, 218, 0.2)',
                                        data: self.cpu.map(function(m) {
                                            return {
                                                x: m[0],
                                                y: m[1]
                                            }
                                        }, [])
                                    }]
                                },
                                options: {
                                    tooltips: {
                                        callbacks: {
                                            title: function(tooltipItem) {
                                                // If this is the memory dataset convert to memory units
                                                if(tooltipItem[0].datasetIndex == 0) {
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

                            var trafficData = self.traffic.map(function(b) {
                                var color = dynamicColors();
                                return {
                                    label: b.url,
                                    borderColor: color,
                                    backgroundColor: 'rgba(218, 218, 218, 0.2)',
                                    data: b.traffic.map(function(t) {
                                        return {
                                            x: t[0],
                                            y: t[1]
                                        }
                                    })
                                }
                            }, []);
                            self.charts.memoryChart = new Chart(document.getElementById('chart-traffic'), {
                                type: 'line',
                                data: {
                                    datasets: trafficData
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

                            self.charts.countriesChart = new Chart(document.getElementById('chart-countries'), {
                                type: 'bar',
                                data: {
                                    labels: Object.keys(self.countries),
                                    datasets: [{
                                        label: 'Country Traffic',
                                        data: Object.keys(self.countries).map(function(k) {
                                            return self.countries[k]
                                        })
                                    }]
                                },
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
                                data: {
                                    labels: Object.keys(self.referrers),
                                    datasets: [{
                                        label: 'Country Traffic',
                                        data: Object.keys(self.referrers).map(function(k) {
                                            return self.referrers[k]
                                        })
                                    }]
                                },
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

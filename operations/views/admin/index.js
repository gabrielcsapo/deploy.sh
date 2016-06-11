/*global Chartist, moment */
var charts = {};
var logs = {};
var repo = {};
var table = {};
var countries = {};

// TODO: add the ability to turn off sync? (could be interesting to stop it and be able to turn it on when needed)
// TODO: 🤕
var getProcesses = function() {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "/process/json");
    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4 && xhr.status == 200) {
            var response = JSON.parse(xhr.responseText);
            response.forEach(function(process) {
                if (charts[process.name]) {
                    countries[process.name] = {};
                    repo[process.name].innerHTML = JSON.stringify(process.repo, null, 4);
                    var series = [];
                    var routes = {};
                    process.traffic.forEach(function(route) {
                        var data = [];
                        route.traffic.forEach(function(r) {
                            if (!routes[route.url]) {
                                routes[route.url] = {
                                    count: 1,
                                    response: 0
                                };
                            }
                            routes[route.url].count += 1;
                            routes[route.url].response += r[1];
                            data.push({
                                x: r[0],
                                y: r[1]
                            });
                            if (r[2]) {
                                if(!countries[process.name][r[2].country]) { countries[process.name][r[2].country] = 0; }
                                countries[process.name][r[2].country] += 1;
                            }
                        });
                        series.push({
                            name: key,
                            data: data
                        });
                    });
                    var trafficCountryData = '<table class="table responsive">' +
                        '<thead>' +
                        '<tr>' +
                        '<th> Country </th>' +
                        '<th> Count </th>' +
                        '</tr>' +
                        '</thead>' +
                        '<tbody>';
                    for (var country in countries[process.name]) {
                        trafficCountryData += '<tr>' +
                            '<th>' + country + '</th>' +
                            '<th>' + countries[process.name][country] + '</th>' +
                        '</tr>';
                    }
                    trafficCountryData += '</tbody></table>';
                    table[process.name]['traffic-country'].innerHTML = trafficCountryData;
                    charts[process.name]['traffic'].update({
                        series: series
                    });
                    // TODO: 🤕
                    var trafficData = '<table class="table responsive">' +
                        '<thead>' +
                        '<tr>' +
                        '<th> Route </th>' +
                        '<th> Visitors </th>' +
                        '<th> Avg Response </th>' +
                        '</tr>' +
                        '</thead>' +
                        '<tbody>';
                    for (var key in routes) {
                        trafficData += '<tr>' +
                            '<th>' + key + '</th>' +
                            '<th>' + routes[key].count + '</th>' +
                            '<th>' + (routes[key].response / routes[key].count).toFixed(2) + 'ms</th>' +
                            '</tr>';
                    }
                    trafficData += '</tbody></table>';
                    table[process.name]['traffic'].innerHTML = trafficData;
                    logs[process.name]['count'].innerHTML = 'logs: ' + process.logs.length;
                    logs[process.name]['log'].innerHTML = process.logs.join('\n');
                    logs[process.name]['log'].scrollTop = logs[process.name]['log'].scrollHeight;
                    var memseries = [];
                    process.memory.forEach(function(mem) {
                        memseries.push({
                            x: mem[0],
                            y: ((mem[1] / 1024) / 1024)
                        });
                    });
                    charts[process.name]['memory'].update({
                        series: [{
                            name: 'memory',
                            data:  memseries
                        }]
                    });
                } else {
                    var div = document.createElement('div');
                    // TODO: 🤕
                    div.innerHTML = '<div class="process-container" id="' + process.name + '">' +
                        '<div class="grid">' +
                        '<div class="col-12-12"><h2 style="float:left;">' + process.name + '</h2><button id="' + process.name + '-redeploy" style="float:right;" class="btn btn-warning"> Redeploy </button></div>' +
                        '<div class="col-12-12"><h5>repo info</h5><pre style="text-align:left;" id="' + process.name + '-repo"></pre></div>' +
                        '<div class="col-6-12"><h5>memory-consumption</h5><div id="' + process.name + '-chart-memory" style="margin-top:60px;"></div></div>' +
                        '<div class="col-6-12"><h5>traffic</h5><div class="nav-tab" style="height:200px;"><ul><li> <input type="radio" name="nav-tab-label" checked="checked" id="label-graph"><label for="label-graph">Graph</label><div><div id="' + process.name + '-chart-traffic"></div></div></li><li><input type="radio" name="nav-tab-label" id="label-data"><label for="label-data">Data</label><div id="' + process.name + '-table-traffic"></div></li></ul></div></div>' +
                        '<div class="col-12-12" style="margin-bottom:40px;"><h5>country traffic</h5><div id="' + process.name + '-table-country-traffic"></div></div>' +
                        '<div class="col-12-12"><div><pre class="process-logs" id="' + process.name + '-logs"></pre><small id="' + process.name + '-logs-count"></small></div></div>' +
                        '</div>' +
                        '</div>';
                    document.getElementById('content').appendChild(div);
                    document.getElementById(process.name + '-redeploy').onclick = function() {
                        var xhttp = new XMLHttpRequest();
                        xhttp.open("GET", "/redeploy/" + process.name, true);
                        xhttp.send();
                    }
                    logs[process.name] = {};
                    logs[process.name]['count'] = document.getElementById(process.name + '-logs-count');
                    logs[process.name]['log'] = document.getElementById(process.name + '-logs');
                    repo[process.name] = document.getElementById(process.name + '-repo');
                    var memory = new Chartist.Line('#' + process.name + '-chart-memory', {
                        series: []
                    }, {
                        axisX: {
                            type: Chartist.FixedScaleAxis,
                            divisor: 5,
                            labelInterpolationFnc: function(value) {
                                return moment(value).format('HH:mm');
                            }
                        },
                        axisY: {
                            offset: 60,
                            labelInterpolationFnc: function(value) {
                                return value + 'mb'
                            },
                            scaleMinSpace: 15,
                            position: 'right'
                        }
                    });
                    var traffic = new Chartist.Line('#' + process.name + '-chart-traffic', {
                        series: []
                    }, {
                        axisX: {
                            type: Chartist.FixedScaleAxis,
                            divisor: 5,
                            labelInterpolationFnc: function(value) {
                                return moment(value).format('HH:mm');
                            }
                        },
                        axisY: {
                            offset: 80,
                            labelInterpolationFnc: function(value) {
                                return value + 'ms'
                            },
                            scaleMinSpace: 15,
                            position: 'right'
                        }
                    });
                    table[process.name] = {};
                    table[process.name]['traffic'] = document.getElementById(process.name + '-table-traffic');
                    table[process.name]['traffic-country'] = document.getElementById(process.name + '-table-country-traffic');

                    countries[process.name] = {};

                    charts[process.name] = {};
                    charts[process.name]['memory'] = memory;
                    charts[process.name]['traffic'] = traffic;
                }
            });
        }
    }
    xhr.send();
};
setInterval(getProcesses, 2000);
getProcesses();

/*global Chartist, moment */
var processes = {};
var charts = {};
var logs = {};
var repo = {};

// TODO: add the ability to turn off sync? (could be interesting to stop it and be able to turn it on when needed)
// TODO: 🤕
var getProcesses = function() {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "/process/json");
    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4 && xhr.status == 200) {
            var response = JSON.parse(xhr.responseText);
            response.forEach(function(process) {
                if (processes[process.name]) {
                    repo[process.name].innerHTML = JSON.stringify(process.repo, null, 4);
                    var series = [];
                    for(var key in process.routes) {
                        var data = [];
                        process.routes[key].forEach(function(route) {
                            data.push({x: route[0], y: route[1]});
                        });
                        series.push({
                            name: key,
                            data: data
                        });
                    }
                    charts[process.name]['traffic'].update({
                        series: series
                    });
                    logs[process.name]['count'].innerHTML = 'logs: ' + process.logs.length;
                    logs[process.name]['log'].innerHTML = process.logs.join('\n');
                    logs[process.name]['log'].scrollTop = logs[process.name]['log'].scrollHeight;
                    processes[process.name].memory.push(((process.monit.memory / 1024) / 1024));
                    charts[process.name]['memory'].update({
                        series: [
                            processes[process.name].memory
                        ]
                    });
                } else {
                    var div = document.createElement('div');
                    div.innerHTML = '<div class="process-container" id="'+process.name+'">' +
                        '<div class="grid">' +
                        '<h3 class="col-12-12">' + process.name + '</h3>' +
                        '<div class="col-12-12"><h5>repo info</h5><pre style="text-align:left;" id="'+process.name+'-repo"></pre></div>' +
                        '<div class="col-6-12"><h5>memory-consumption</h5><div id="'+process.name+'-chart-memory"></div></div>' +
                        '<div class="col-6-12"><h5>traffic</h5><div id="'+process.name+'-chart-traffic"></div></div>' +
                        '<div class="col-12-12"><div><pre class="process-logs" id="'+process.name+'-logs"></pre><small id="'+process.name+'-logs-count"></small></div></div>' +
                        '</div>' +
                    '</div>';
                    document.getElementById('content').appendChild(div);
                    logs[process.name] = {};
                    logs[process.name]['count'] = document.getElementById(process.name + '-logs-count');
                    logs[process.name]['log'] = document.getElementById(process.name + '-logs');
                    repo[process.name] = document.getElementById(process.name + '-repo');
                    var memory = new Chartist.Line('#' + process.name + '-chart-memory', {
                        series: []
                    }, {
                        axisY: {
                            offset: 60,
                            labelInterpolationFnc: function(value) {
                                return value.toFixed(1) + 'mb'
                            },
                            scaleMinSpace: 15
                        },
                        fullWidth: true,
                        showArea: true
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
                              offset: 45,
                              labelInterpolationFnc: function(value) {
                                  return value + 'ms'
                              },
                              scaleMinSpace: 15,
                            position: 'right'
                          }
                      });
                    charts[process.name] = {};
                    charts[process.name]['memory'] = memory;
                    charts[process.name]['traffic'] = traffic;
                    processes[process.name] = {
                        memory: [((process.monit.memory / 1024) / 1024)]
                    }
                }
            });
        }
    }
    xhr.send();
};
setInterval(getProcesses, 3000);

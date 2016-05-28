var processes = {};
var charts = {};
var logs = {};

// TODO: 🤕
var getProcesses = function() {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "/process/json");
    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4 && xhr.status == 200) {
            var response = JSON.parse(xhr.responseText);
            response.forEach(function(process) {
                if (processes[process.name]) {
                    logs[process.name]['count'].innerHTML = 'logs: ' + process.logs.length;
                    logs[process.name]['log'].innerHTML = process.logs.join('\n');
                    logs[process.name]['log'].scrollTop = logs[process.name]['log'].scrollHeight;
                    processes[process.name].memory.push(((process.monit.memory / 1024) / 1024));
                    charts[process.name].update({
                        series: [
                            processes[process.name].memory
                        ]
                    });
                } else {
                    var div = document.createElement('div');
                    div.innerHTML = '<div class="grid process-container" id="'+process.name+'">' +
                        '<h3 class="col-12-12">' + process.name + ':memory-consumption</h3>' +
                        '<div class="col-6-12" id="'+process.name+'-chart"></div>' +
                        '<div class="col-6-12"><pre class="process-logs" id="'+process.name+'-logs"></pre><small id="'+process.name+'-logs-count"></small></div>' +
                    '</div>';
                    document.getElementById('content').appendChild(div);
                    logs[process.name] = {};
                    logs[process.name]['count'] = document.getElementById(process.name + '-logs-count');
                    logs[process.name]['log'] = document.getElementById(process.name + '-logs');
                    var chart = new Chartist.Line('#' + process.name + '-chart', {
                        series: []
                    }, {
                        axisY: {
                            offset: 40,
                            labelInterpolationFnc: function(value) {
                                return value + 'mb'
                            },
                            scaleMinSpace: 15
                        },
                        fullWidth: true,
                        showArea: true,
                        chartPadding: {
                            right: 40
                        }
                    });
                    charts[process.name] = chart;
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

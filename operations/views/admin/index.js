var processes = {};
var charts = {};

// TODO: 🤕
setInterval(function() {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "/process/json");
    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4 && xhr.status == 200) {
            var response = JSON.parse(xhr.responseText);
            response.forEach(function(process) {
                if (processes[process.name]) {
                    processes[process.name].memory.push(((process.monit.memory / 1024) / 1024));
                    charts[process.name].update({
                        series: [
                            processes[process.name].memory
                        ]
                    });
                } else {
                    var div = document.createElement('div');
                    div.innerHTML = '<div id="'+process.name+'">' +
                        '<h3>' + process.name + ':memory-consumption</h3>' +
                        '<div id="'+process.name+'-chart"></div>' +
                    '</div>';
                    document.getElementById('content').appendChild(div);
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
}, 3000);

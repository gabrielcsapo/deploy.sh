var processes = {};
var charts = {};

// TODO: 🤕
setInterval(function() {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "/admin/process/json");
    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4 && xhr.status == 200) {
            var response = JSON.parse(xhr.responseText);
            response.forEach(function(process) {
                if(processes[process.name]) {
                    processes[process.name].memory.push(process.monit.memory);
                    charts[process.name].update({
                        series: [
                            processes[process.name].memory
                        ]
                    });
                } else {
                    // TODO: clean this up, just use innerHTML to stuff all the needed elements inside
                    var div = document.createElement('div');
                    div.id = process.name;
                    document.getElementById('content').appendChild(div);
                    var name = document.createElement('h3')
                    name.innerHTML = process.name + ':memory-consumption';
                    div.appendChild(name);
                    var chart_div = document.createElement('div');
                    chart_div.id = process.name + '-chart';
                    div.appendChild(chart_div);
                    var chart = new Chartist.Line('#' + process.name + '-chart' , {
                      series: [
                          [process.monit.memory]
                      ]
                    }, {
                      fullWidth: true,
                      showArea: true,
                      chartPadding: {
                        right: 40
                      }
                    });
                    charts[process.name] = chart;
                    processes[process.name] = {
                        memory: [process.monit.memory]
                    }
                }
            });
            console.log(processes);
        }
    }
    xhr.send();
}, 3000);

/*global Chartist, moment */

var charts, logs, repo, table, countries, referrer = {}
var name = window.location.pathname.replace('/application/', '');

// TODO: add the ability to turn off sync? (could be interesting to stop it and be able to turn it on when needed)
// TODO: 🤕
var render = function(process) {
  if (charts) {
      countries = {};
      referrer = {};
      repo.innerHTML = JSON.stringify(process.repo, null, 4);
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
              // country data
              if (r[2]) {
                  if(!countries[r[2].country]) { countries[r[2].country] = 0; }
                  countries[r[2].country] += 1;
              }
              // referrer data
              if(r[3]) {
                  if(!referrer[r[3]]) { referrer[r[3]] = 0; }
                  referrer[r[3]] += 1;
              }
          });
          series.push({
              name: key,
              data: data
          });
      });
      var trafficReferrerData = '<table class="table responsive">' +
          '<thead>' +
          '<tr>' +
          '<th> Referrer </th>' +
          '<th> Count </th>' +
          '</tr>' +
          '</thead>' +
          '<tbody>';
      for (var url in referrer) {
          trafficReferrerData += '<tr>' +
              '<th>' + url + '</th>' +
              '<th>' + referrer[url] + '</th>' +
          '</tr>';
      }
      trafficReferrerData += '</tbody></table><br><small> unique: ' + Object.keys(referrer).length + '</small>';
      table['traffic-referrer'].innerHTML = trafficReferrerData;

      var trafficCountryData = '<table class="table responsive">' +
          '<thead>' +
          '<tr>' +
          '<th> Country </th>' +
          '<th> Count </th>' +
          '</tr>' +
          '</thead>' +
          '<tbody>';
      for (var country in countries) {
          trafficCountryData += '<tr>' +
              '<th>' + country + '</th>' +
              '<th>' + countries[country] + '</th>' +
          '</tr>';
      }
      trafficCountryData += '</tbody></table><br><small> unique: ' + Object.keys(countries).length + '</small>';
      table['traffic-country'].innerHTML = trafficCountryData;
      charts['traffic'].update({
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
      trafficData += '</tbody></table><br><small> unique: ' + Object.keys(routes).length + '</small>';
      table['traffic'].innerHTML = trafficData;
      logs['count'].innerHTML = 'logs: ' + process.logs.length;
      logs['log'].innerHTML = process.logs.join('\n');
      logs['log'].scrollTop = logs['log'].scrollHeight;
      var memseries = [];
      process.memory.forEach(function(mem) {
          memseries.push({
              x: mem[0],
              y: ((mem[1] / 1024) / 1024)
          });
      });
      charts['memory'].update({
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
          '<div class="col-12-12"><a class="btn border-primary" style="float:left;text-decoration:none;" href="/applications">' + process.name + '</a><button id="' + process.name + '-redeploy" style="float:right;" class="btn border-warning"> Redeploy </button></div>' +
          '<div class="col-12-12"><h3>repo info</h3><pre style="text-align:left;" id="' + process.name + '-repo"></pre></div>' +
          '<div class="col-12-12"><h3>memory-consumption</h3><div id="' + process.name + '-chart-memory" style="margin-top:60px;"></div></div>' +
          '<div class="col-12-12"><h3>traffic</h3><div class="nav-tab" style="height:200px;"><ul><li> <input type="radio" name="nav-tab-label" checked="checked" id="label-graph"><label for="label-graph">Graph</label><div><div id="' + process.name + '-chart-traffic"></div></div></li><li><input type="radio" name="nav-tab-label" id="label-data"><label for="label-data">Data</label><div id="' + process.name + '-table-traffic"></div></li></ul></div></div>' +
          '<div class="col-12-12" style="margin-bottom:40px;"><h3>country traffic</h3><div id="' + process.name + '-table-country-traffic"></div></div>' +
          '<div class="col-12-12" style="margin-bottom:40px;"><h3>referrer traffic</h3><div id="' + process.name + '-table-referrer-traffic"></div></div>' +
          '<div class="col-12-12"><div><pre class="process-logs" id="' + process.name + '-logs"></pre><small id="' + process.name + '-logs-count"></small></div></div>' +
          '</div>' +
          '</div>';
      document.getElementById('content').appendChild(div);
      document.getElementById(process.name + '-redeploy').onclick = function() {
          document.getElementById(process.name + '-redeploy').innerHTML = '<div class="spinner spinner-primary"></div>';
          var xhr = new XMLHttpRequest();
          xhr.open("GET", "/redeploy/" + process.name, true);
          xhr.onreadystatechange = function() {
              if (xhr.readyState == 4 && xhr.status == 200) {
                document.getElementById(process.name + '-redeploy').innerHTML = 'Deploy Successful';
                setTimeout(function() {
                  document.getElementById(process.name + '-redeploy').innerHTML = 'Redeploy';
                }, 1000);
              }
          }
          xhr.send();
      }
      logs = {};
      logs['count'] = document.getElementById(process.name + '-logs-count');
      logs['log'] = document.getElementById(process.name + '-logs');
      repo = document.getElementById(process.name + '-repo');
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
      table = {};
      table['traffic'] = document.getElementById(process.name + '-table-traffic');
      table['traffic-country'] = document.getElementById(process.name + '-table-country-traffic');
      table['traffic-referrer'] = document.getElementById(process.name + '-table-referrer-traffic');

      referrer = {};
      countries = {};

      charts = {};
      charts['memory'] = memory;
      charts['traffic'] = traffic;
  }
}

var fetch = function() {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "/process/" + name + "/json");
    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4 && xhr.status == 200) {
            var process = JSON.parse(xhr.responseText);
            render(process);
        }
    }
    xhr.send();
};
setInterval(fetch, 2000);
fetch();

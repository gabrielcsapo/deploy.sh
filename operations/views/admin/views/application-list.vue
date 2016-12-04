<template>
  <small v-if="Object.keys(processes).length == 0" style="height:100px;" class="vertical-center"> Currently no applications are running :( </small>
  <ul v-else class="list">
    <application-list-item
      v-for="process in processes"
      v-bind:instances="process.instances || 'none'"
      v-bind:cpuUsage="process.cpu[process.cpu - 1] ? process.cpu[process.cpu - 1][1] : 0"
      v-bind:memoryUsage="formatSize(process.memory[process.memory.length - 1] ? process.memory[process.memory.length - 1][1] : 0)"
      v-bind:name="process.name"
      v-bind:status="process.status || 'offline'"
    >
    </application-list-item>
  </ul>
</template>

<script>
/* global io */
var Utils = require('../utils');
var Vue = require('vue');

Vue.component('application-list-item', {
  props: ['instances', 'cpuUsage', 'memoryUsage', 'name', 'status'],
  template: `<li class="list-item">
    <div class="list-item-left">
        <a :href="'/application/' + name"> {{ name }} </a>
    </div>
    <div class="list-item-right">
        <div class="badge badge-default popover-container">
          {{ cpuUsage }}%
          <span class="popover top">CPU</span>
        </div>

        <div class="badge badge-default popover-container">
          {{ memoryUsage }}
          <span class="popover top">Memory</span>
        </div>

        <div class="badge badge-default popover-container">
          {{ instances }}
          <span class="popover top">Instance Count</span>
        </div>

        <div class="badge badge-default popover-container">
          {{ status }}
          <span class="popover top">Status</span>
        </div>
    </div>
  </li>`
});

module.exports = {
    data: {
        processes: {}
    },
    created: function() {
        var self = this;
        var socket = io.connect('/');
        Utils.get('/api/process/json', function(processes) {
            self.processes = processes;

            self.processes.forEach(function(process, i) {
              socket.on(process.name + '-memory', function(data) {
                self.processes[i].cpu.push(data.cpu);
                self.processes[i].memory.push(data.memory);
              });

              socket.on(process.name + '-uptime', function(data) {
                self.processes[i].created_at = data.created_at;
                self.processes[i].status = data.status;
                self.processes[i].instances = data.instances;
              });
            });
        });
    },
    methods: {
        formatSize: function(bytes) {
            if (bytes == 0) return '0 B';
            var sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
            var i = Math.floor(Math.log(bytes) / Math.log(1000));
            return parseFloat((bytes / Math.pow(1000, i)).toFixed(3)) + ' ' + sizes[i];
        }
    }
};
</script>

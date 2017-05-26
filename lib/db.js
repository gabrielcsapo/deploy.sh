const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/node-distribute');

module.exports.Traffic = mongoose.model('traffic', {});

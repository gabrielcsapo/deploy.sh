const Mongorito = require('mongorito');
const Model = Mongorito.Model;

Mongorito.connect('localhost:32768/node-distribute');

module.exports.Traffic = Model.extend({
    collection: () => 'traffic'
});

var webpack = require('webpack');

module.exports = {
    entry: './operations/views/admin/index.js',
    output: {
        filename: './operations/views/admin/dist/app.js'
    },
    resolve: {
        alias: {
            vue: 'vue/dist/vue.js'
        }
    },
    loaders: [{
        test: /\.js$/,
        loader: 'babel',
        query: {
            presets: ['es2015']
        }
    }],
    plugins: [
        new webpack.optimize.UglifyJsPlugin({
            minimize: true,
            compress: {
                warnings: false
            }
        })
    ]
};

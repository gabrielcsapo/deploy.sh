module.exports = {
  entry: './operations/views/admin/index.js',
  output: {
    filename: './operations/views/admin/dist/app.js'
  },
  resolve: {
    alias: {
      vue: 'vue/dist/vue.js'
    }
  }
};
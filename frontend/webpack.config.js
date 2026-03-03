const path = require('path');

module.exports = {
  entry: './src/main.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    clean: true,
  },
  devServer: {
    static: path.resolve(__dirname, '.'),
    port: 8080,
    hot: true,
    proxy: [
      { context: ['/api'], target: 'http://localhost:3000' },
    ],
  },
  module: {
    rules: [
      {
        test: /\.(png|svg|jpg|gif|mp3|ogg)$/i,
        type: 'asset/resource',
      },
    ],
  },
};

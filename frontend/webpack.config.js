const path = require('path');
const webpack = require('webpack');

module.exports = {
  entry: './src/main.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    clean: true,
  },
  plugins: [
    new webpack.DefinePlugin({
      __API_URL__: JSON.stringify(process.env.API_URL || ''),
    }),
  ],
  devServer: {
    static: path.resolve(__dirname, '.'),
    host: '0.0.0.0',
    port: 8080,
    hot: true,
    allowedHosts: 'all',
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

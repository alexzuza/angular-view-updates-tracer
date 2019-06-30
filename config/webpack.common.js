const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const srcDir = '../src/';

module.exports = {
  entry: {
    content: path.join(__dirname, srcDir + 'content.ts'),
    tracer: path.join(__dirname, srcDir + 'tracer/index.ts'),
    popup: path.join(__dirname, srcDir + 'popup.ts')
  },
  output: {
    path: path.join(__dirname, '../dist/js'),
    filename: '[name].js'
  },
  optimization: {
    splitChunks: {
      name: 'vendor',
      chunks: "initial"
    }
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  plugins: [
    new CopyPlugin(
      [{from: '.', to: '../'}],
      {context: 'public'}
    ),
  ]
};

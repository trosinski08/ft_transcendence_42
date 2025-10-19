const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = (env, argv) => {
  const isProd = argv.mode === 'production';
  return {
    mode: isProd ? 'production' : 'development',
    entry: path.resolve(__dirname, 'src', 'main.ts'),
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].[contenthash].js',
      clean: true,
      publicPath: '/'
    },
    devServer: {
      static: path.resolve(__dirname, 'dist'),
      host: '0.0.0.0',
      port: 3000,
      hot: true,
      historyApiFallback: true,
      proxy: {
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
          logLevel: 'warn'
        }
      }
    },
    resolve: {
      extensions: ['.ts', '.js']
    },
    module: {
      rules: [
        { test: /\.ts$/, use: 'ts-loader', exclude: /node_modules/ },
        { test: /\.css$/, use: [isProd ? MiniCssExtractPlugin.loader : 'style-loader','css-loader','postcss-loader'] }
      ]
    },
    plugins: [
      new HtmlWebpackPlugin({ template: path.resolve(__dirname, 'src', 'index.html') }),
      ...(isProd ? [new MiniCssExtractPlugin({ filename: '[name].[contenthash].css' })] : [])
    ]
  };
};

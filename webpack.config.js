const path = require('path');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const resolveTsconfigPathsToAlias = require('./resolve-tsconfig-path-to-webpack-alias');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: './src/index.ts',
  // devtool: 'inline-source-map',
  devServer: {
    static: './dist',
    https: {
      key: './certificates/server.key',
      cert: './certificates/server.crt',
      passphrase: 'pass:gsahdg',
      requestCert: false,
    },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      { 
        test: /\.(woff|woff2|eot|ttf|svg)$/, 
        type: 'asset/resource',
      },
      {
        test: /\.s[ac]ss$/i,
        use: [
          MiniCssExtractPlugin.loader,
          "css-loader",
          "sass-loader",
        ],
      },
      {
        test: /\.css$/i,
        use: [
          MiniCssExtractPlugin.loader, 
          "css-loader",
        ],
      },
      {
        test: /\.worker\.js$/,
        use: { loader: "worker-loader" },
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    alias: resolveTsconfigPathsToAlias(),
  },
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist'),
  },
  optimization: {
    minimize: true,
    minimizer: [
      new CssMinimizerPlugin({
        minify: CssMinimizerPlugin.cleanCssMinify,
      }),
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: 'Boombox JS',
      filename: './index.html',
      template: './src/index.html',
    }),
    new MiniCssExtractPlugin({
      filename: "[name].css",
      chunkFilename: "[id].css",
    }),
    new CopyPlugin({
      patterns: [
        { 
          from: path.resolve(__dirname, "node_modules/jsmediatags/dist/jsmediatags.min.js"), 
          to: "jsmediatags.min.js",
        },
        {
          from: path.resolve(__dirname, "src/sounds"), 
          to: "sounds",
        },
        {
          from: path.resolve(__dirname, "src/data"), 
          to: "data",
        }
      ],
    }),
  ],
};
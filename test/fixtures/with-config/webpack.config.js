/** @type {import('webpack').Configuration} */
const webpackConfig = {
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: '@ts-tools/webpack-loader',
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.mjs', '.js', '.json'],
  },
};

export default webpackConfig;

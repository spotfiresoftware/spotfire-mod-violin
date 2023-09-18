const path = require("path");
const webpack = require("webpack");
const CopyPlugin = require("copy-webpack-plugin");

const keysTransformer = require("ts-transformer-keys/transformer").default;

module.exports = {
    mode: "development",
    entry: "./src/index.ts",
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "bundle.js"
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: "ts-loader",
                exclude: /node_modules/,
                options: {
                    // make sure not to set `transpileOnly: true` here, otherwise it will not work
                    getCustomTransformers: (program) => ({
                        before: [keysTransformer(program)]
                    })
                }
            }, 
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader']
            }
        ]
    },
    resolve: {
        extensions: [".tsx", ".ts", ".js"],
        fallback: { fs: false, buffer: require.resolve("buffer"), "util": false, tty: false }
    },
    plugins: [
        new CopyPlugin({ patterns: [{ from: "static" }] }),
        new webpack.ProvidePlugin({
            Buffer: ["buffer", "Buffer"]
        })
    ],
    performance: {
        maxEntrypointSize: 800000,
        maxAssetSize: 800000
    }
};

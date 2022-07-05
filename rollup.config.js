import resolve from "@rollup/plugin-node-resolve";
import sucrase from "@rollup/plugin-sucrase";
import livereload from "rollup-plugin-livereload";
import serve from "rollup-plugin-serve";

export default [
  {
    input: "buildroots/app.ts",
    output: {
      file: "docs/app.js",
    },
    plugins: [
      resolve({ extensions: [".ts", ".tsx"] }),
      sucrase({
        exclude: ["node_modules/**"],
        transforms: ["typescript"],
        production: true,
      }),
      livereload({
        delay: 0,
        // inject: false,
      }),
      serve({
        // https://github.com/thgh/rollup-plugin-serve
        open: true,
        openPage: "/",
        port: 8080,

        // Show server address in console (default: true)
        verbose: false,
        contentBase: ["docs"],

        // Set to true to return index.html (200) instead of error page (404)
        historyApiFallback: true,

        // execute function after server has begun listening
        onListening: function (server) {
          const address = server.address();
          const host = address.address === "::" ? "localhost" : address.address;
          // by using a bound function, we can access options as `this`
          const protocol = this.https ? "https" : "http";
          console.log(
            `Server listening at ${protocol}://${host}:${address.port}/`
          );
        },
      }),
    ],
  },
];

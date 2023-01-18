import esbuild from "esbuild";
import { NodeGlobalsPolyfillPlugin } from "@esbuild-plugins/node-globals-polyfill";
import { NodeModulesPolyfillPlugin } from "@esbuild-plugins/node-modules-polyfill";

esbuild.build({
	entryPoints: [ "./VerifiableCredential/index.mjs" ],
	outfile: "./dist/VerifiableCredential.mjs",
	platform: "browser",
	format: "esm",
	bundle: true,
	minify: true,
	plugins: [
		NodeGlobalsPolyfillPlugin(),
		NodeModulesPolyfillPlugin(),
	],
});

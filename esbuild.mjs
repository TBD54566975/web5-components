import esbuild from "esbuild";
import { NodeGlobalsPolyfillPlugin } from "@esbuild-plugins/node-globals-polyfill";
import { NodeModulesPolyfillPlugin } from "@esbuild-plugins/node-modules-polyfill";

for (let name of [ "CredentialManifest", "VerifiableCredential" ]) {
	esbuild.build({
		entryPoints: [ `./${name}/index.mjs` ],
		outfile: `./dist/${name}.mjs`,
		platform: "browser",
		format: "esm",
		bundle: true,
		minify: true,
		plugins: [
			NodeGlobalsPolyfillPlugin(),
			NodeModulesPolyfillPlugin(),
		],
	});
}

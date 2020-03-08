#!/usr/bin/env node

import { CommandSpec } from "@phylum/command";
import { bootstrap } from "../common/bootstrap";
import { getConfig } from "../compiler/config";
import { ModuleCompiler } from "../compiler/module-compiler";
import { LogLevel } from "../common/logging";
import { SvgBuilder } from "../compiler/svg-builder";
import { writeOutput } from "../compiler/file-emitter";

bootstrap(async (argv, log, logWriter) => {
	const command = argv.shift();
	switch (command) {
		case "render": {
			const args = new CommandSpec([
				{ name: "config", alias: "c" },
				{ name: "watch", alias: "w", type: "flag" },
				{ name: "verbose", alias: "v", type: "flag" }
			]).parse(argv);

			if (args.verbose) {
				logWriter.level = LogLevel.Debug;
			}

			const config = await getConfig(args.config);
			log.debug("Using config:", config);

			const moduleCompiler = new ModuleCompiler(config, log.fork("module-compiler"));

			const svgBuilder = new SvgBuilder(config, log.fork("svg-builder"));
			svgBuilder.use(moduleCompiler);

			writeOutput(svgBuilder);

			if (args.watch) {
				moduleCompiler.watch();
			} else {
				moduleCompiler.run();
			}
			break;
		}

		// case "preview": {
		// 	const args = new CommandSpec([
		// 		{ name: "project", alias: "p" },
		// 		{ name: "port", type: "number" },
		// 		{ name: "address" }
		// 	]).parse(argv);

		// 	const config = getConfig(args.project);

		// 	const moduleCompiler = new ModuleCompiler(config);
		// 	const svgBuilder = new SvgBuilder(config);
		// 	svgBuilder.use(moduleCompiler);

		// 	// TODO: Start preview server.

		// 	moduleCompiler.watch();
		// 	break;
		// }

		default: throw new Error(`Unknown command: ${command}`);
	}
});

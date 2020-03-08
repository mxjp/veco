#!/usr/bin/env node

import { CommandSpec } from "@phylum/command";
import { bootstrap } from "../common/bootstrap";
import { readConfigFile, PREVIEW_CONFIG_ARG_SPECS, applyConfigArgs } from "../compiler/config";
import { ModuleCompiler } from "../compiler/module-compiler";
import { LogLevel, Log } from "../common/logging";
import { SvgBuilder } from "../compiler/svg-builder";
import { writeOutput } from "../compiler/file-emitter";

bootstrap(async (argv, log, logWriter) => {
	const baseArgs = new CommandSpec([
		{ name: "verbose", alias: "v", type: "flag" }
	]).parse(argv, { partial: true });
	if (baseArgs.verbose) {
		logWriter.level = LogLevel.Debug;
	}

	const command = argv.shift();
	switch (command) {
		case "render": {
			const args = new CommandSpec([
				{ name: "config", alias: "c" },
				{ name: "watch", alias: "w", type: "flag" },
				{ name: "verbose", alias: "v", type: "flag" }
			]).parse(argv);
			const { moduleCompiler, svgBuilder } = await setupCompiler(log, args);
			writeOutput(svgBuilder);
			if (args.watch) {
				moduleCompiler.watch();
			} else {
				moduleCompiler.run();
			}
			break;
		}

		case "preview": {
			const args = new CommandSpec([
				{ name: "config", alias: "c" },
				{ name: "verbose", alias: "v", type: "flag" },
				...PREVIEW_CONFIG_ARG_SPECS
			]).parse(argv);
			const { config, moduleCompiler, svgBuilder } = await setupCompiler(log, args);
			// TODO: Start preview server.
			moduleCompiler.watch();
			break;
		}

		default: throw new Error(`Unknown command: ${command}`);
	}
});

async function setupCompiler(log: Log, args: any) {
	const config = await readConfigFile(args.config);
	applyConfigArgs(config, args);
	log.debug("Using config:", config);

	const moduleCompiler = new ModuleCompiler(config, log.fork("module-compiler"));

	const svgBuilder = new SvgBuilder(config, log.fork("svg-builder"));
	svgBuilder.use(moduleCompiler);

	return { config, moduleCompiler, svgBuilder };
}

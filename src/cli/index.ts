#!/usr/bin/env node
import "v8-compile-cache";

import { CommandSpec } from "@phylum/command";
import { bootstrap } from "../common/bootstrap";
import { readConfigFile, PREVIEW_CONFIG_ARG_SPECS, applyConfigArgs, Config, SvgTarget } from "../compiler/config";
import { ModuleCompiler } from "../compiler/module-compiler";
import { LogLevel, Log } from "../common/logging";
import { SvgBuilder } from "../compiler/svg-builder";
import { writeOutput } from "../compiler/file-emitter";
import { PreviewServer } from "../compiler/preview-server";

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
			const config = await getConfig(log, args);
			const { moduleCompiler, svgBuilder } = await setupCompiler(log, config, args);
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
			const config = await getConfig(log, args);
			config.target = SvgTarget.dom;
			const { moduleCompiler, svgBuilder } = await setupCompiler(log, config, args);
			const server = new PreviewServer(config, log.fork("preview"));
			server.use(svgBuilder);
			const info = await server.start();
			log.info(info);
			moduleCompiler.watch();
			break;
		}

		default: throw new Error(`Unknown command: ${command}`);
	}
});

async function getConfig(log: Log, args: any) {
	const config = await readConfigFile(args.config);
	applyConfigArgs(config, args);
	log.debug("Using config:", config);
	return config;
}

async function setupCompiler(log: Log, config: Config, args: any) {
	const moduleCompiler = new ModuleCompiler(config, log.fork("module-compiler"));
	moduleCompiler.on("watcherError", error => log.error("watcher error:", error));
	moduleCompiler.on("watchRuntimeError", error => log.error("runtime error:", error));

	const svgBuilder = new SvgBuilder(config, log.fork("svg-builder"));
	svgBuilder.use(moduleCompiler);

	return { moduleCompiler, svgBuilder };
}

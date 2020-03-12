#!/usr/bin/env node
import "v8-compile-cache";

import { CommandSpec } from "@phylum/command";
import { bootstrap } from "../common/bootstrap";
import { readConfigFile, PREVIEW_CONFIG_ARG_SPECS, applyConfigArgs, Config, RenderTarget, RENDER_CONFIG_ARG_SPECS } from "../compiler/config";
import { ModuleCompiler } from "../compiler/module-compiler";
import { LogLevel, Log } from "../common/logging";
import { Renderer } from "../compiler/renderer";
import { writeOutput } from "../compiler/file-emitter";
import { PreviewServer } from "../compiler/preview-server";
import * as ts from "typescript";
import { isIPv6 } from "net";

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
				{ name: "verbose", alias: "v", type: "flag" },
				...RENDER_CONFIG_ARG_SPECS
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
			config.target = RenderTarget.dom;
			const { moduleCompiler, svgBuilder } = await setupCompiler(log, config, args);
			const server = new PreviewServer(config, log.fork("preview"));
			server.use(svgBuilder);

			const info = await server.start();

			const address = (info.address === "::1" || info.address === "127.0.0.1") ? "localhost" : info.address;
			log.info(`Preview server listening on http://${isIPv6(address) ? `[${address}]` : address}:${info.port}/`);

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
	const formatHost: ts.FormatDiagnosticsHost = {
		getCanonicalFileName: path => path,
		getCurrentDirectory: ts.sys.getCurrentDirectory,
		getNewLine: () => "\n"
	};

	const moduleCompiler = new ModuleCompiler(config, log.fork("module-compiler"));
	moduleCompiler.on("watcherError", error => log.error("watcher error:", error));
	moduleCompiler.on("watchRuntimeError", error => log.error("runtime error:", error));
	moduleCompiler.on("done", result => {
		const diagnostics = ts.formatDiagnosticsWithColorAndContext(result.diagnostics, formatHost).trim();
		const errorCount = result.diagnostics.filter(d => d.category === ts.DiagnosticCategory.Error).length;
		log.info(`Compilation finished with ${errorCount} error(s).${diagnostics ? `\n\n${diagnostics}\n` : ""}`);
		if (errorCount > 0) {
			process.exitCode = 1;
		}
	});

	const svgBuilder = new Renderer(config, log.fork("svg-builder"));
	svgBuilder.use(moduleCompiler);
	svgBuilder.on("error", error => {
		log.error(error);
		process.exitCode = 1;
	});

	return { moduleCompiler, svgBuilder };
}

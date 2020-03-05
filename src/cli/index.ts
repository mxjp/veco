#!/usr/bin/env node

import { CommandSpec } from "@phylum/command";
import { bootstrap } from "../common/bootstrap";
import { getConfig } from "../compiler/config";
import { ModuleCompiler, SvgBuilder } from "../compiler";
import { writeFiles } from "../compiler/file-emitter";

bootstrap((argv, log) => {
	const command = argv.shift();
	switch (command) {
		case "render":
			const args = new CommandSpec([
				{ name: "project", alias: "p" },
				{ name: "watch", alias: "w", type: "flag" }
			]).parse(argv);

			const config = getConfig(args.project);

			const moduleCompiler = new ModuleCompiler(config);
			const svgBuilder = new SvgBuilder(config);
			svgBuilder.use(moduleCompiler);

			writeFiles(svgBuilder);

			if (args.watch) {
				moduleCompiler.watch();
			} else {
				moduleCompiler.run();
			}
			break;

		default:
			throw new Error(`Unknown command: ${command}`);
	}
});

import { Async, then } from "./async";
import { Log, LogWriter } from "./logging";

export function bootstrap(main: (argv: string[], log: Log) => Async) {
	const log = Log.create();
	new LogWriter({ log, output: process.stderr });

	process.on("uncaughtException", error => {
		log.fork("bootstrap").error("uncaught exception:", error);
		process.exit(1);
	});

	process.on("unhandledRejection", error => {
		log.fork("bootstrap").error("unhandled rejection:", error);
		process.exit(1);
	});

	then(main(process.argv.slice(2), log), () => {}, error => {
		log.fork("bootstrap").error(error);
		process.exit(1);
	});
}

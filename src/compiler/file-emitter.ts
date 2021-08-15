import path from "path";
import { sync as mkdir } from "mkdirp";
import { IEmitter } from "../common/emitter";
import { writeFileSync } from "fs";

export interface FileEvent {
	readonly filename: string;
	readonly data: string | Buffer;
}

export type FileEmitter = IEmitter<"file", [FileEvent]>;

export function writeOutput(source: FileEmitter) {
	return source.hook("file", ({ filename, data }) => {
		mkdir(path.dirname(filename));
		writeFileSync(filename, data, typeof data === "string" ? "utf8" : undefined);
	});
}

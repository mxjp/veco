import { IEmitter, Event } from "../common/emitter";
import { writeFileSync } from "fs";

export interface FileEmitter extends IEmitter<{
	file: Event<[string, string]>
}> {}

export function writeFiles(source: FileEmitter) {
	return source.hook("file", (filename, data) => {
		writeFileSync(filename, data, "utf8");
	});
}

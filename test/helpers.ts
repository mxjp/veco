import * as path from "path";
import * as mkdirp from "mkdirp";
import { promises as fs } from "fs";
import { ExecutionContext } from "ava";

const testDataRoot = path.join(__dirname, "../data");

let nextTestDirId = 0;

export async function createTestDir(t: ExecutionContext) {
	const name = `${process.pid}-${nextTestDirId++}`;
	t.log("Using test dir:", name);
	const dirname = path.join(testDataRoot, name);
	await mkdirp(dirname);
	return dirname;
}

export async function writeFiles(dirname: string, files: Record<string, string>) {
	await Promise.all(Object.entries(files).map(async ([name, data]) => {
		const filename = path.join(dirname, name);
		await mkdirp(path.dirname(filename));
		await fs.writeFile(filename, normalizeCode(data));
	}));
}

// Deindent code and remove leading empty lines.
function normalizeCode(data: string) {
	const lines = data.split("\n");
	for (let i = 0; i < lines.length; i++) {
		if (!/^\s*$/.test(lines[i])) {
			const indent = /^\t*/.exec(lines[i])![0].length;
			return lines.slice(i).map(line => line.slice(indent)).join("\n");
		}
	}
	return data;
}

export async function wait<T>(condition: () => T, timeout = 1e4) {
	const start = Date.now();
	for (let i = 0;; i++) {
		const value = condition();
		if (value) {
			return value;
		}
		if (Date.now() - start > timeout) {
			throw new Error("timeout");
		}
		await new Promise(r => setTimeout(r, i * 10));
	}
}

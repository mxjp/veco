import test from "ava";
import * as path from "path";
import { ModuleCompiler, ModuleCompilerOutput } from "../../src/compiler/module-compiler";
import { createTestDir, writeFiles, wait } from "../helpers";

test(".run() compiles included sources once", async t => {
	const cwd = await createTestDir(t);
	await writeFiles(cwd, {
		"foo.ts": `
			import { bar } from "./bar";
			export const baz = bar;
		`,
		"bar.tsx": `
			export const bar = 42;
		`
	});

	const [output, compilations] = createCaptureOutput(cwd);
	const moduleCompiler = new ModuleCompiler({ cwd, output });

	moduleCompiler.run();
	t.is(compilations.length, 1);
	t.is(Object.keys(compilations[0]).length, 2);
	t.true(compilations[0]["foo.veco"].includes(`require("./bar")`));
});

test(".watch() compiles included sources and incrementally emits updates", async t => {
	const cwd = await createTestDir(t);
	await writeFiles(cwd, {
		"foo.ts": `
			import { bar } from "./bar";
			export const baz = bar;
		`,
		"bar.tsx": `
			export const bar = 42;
		`
	});

	const [output, compilations] = createCaptureOutput(cwd);
	const moduleCompiler = new ModuleCompiler({ cwd, output });

	const watching = moduleCompiler.watch();
	watching.on("error", error => t.fail(error));

	const first = await wait(() => compilations[0]);
	t.is(Object.keys(first).length, 2);

	await writeFiles(cwd, {
		"foo.ts": `
			import { bar } from "./bar";
			export const baz = bar * 6;
		`
	});
	const second = await wait(() => compilations[1]);
	t.is(Object.keys(second).length, 1);
	t.true(second["foo.veco"].includes("6"));

	await watching.close();

	t.pass();
});

test("includes and excludes specific files if configured", async t => {
	const cwd = await createTestDir(t);
	await writeFiles(cwd, {
		"foo.ts": "",
		"bar.ts": "",
		"baz.tz": ""
	});

	const [output, compilations] = createCaptureOutput(cwd);
	const moduleCompiler = new ModuleCompiler({
		cwd,
		output,
		include: ["foo*"],
		exclude: ["bar*"]
	});

	moduleCompiler.run();

	t.is(compilations.length, 1);
	t.is(Object.keys(compilations[0]).length, 1);
	t.true("foo.veco" in compilations[0]);
});

export function createCaptureOutput(relativeTo: string): [ModuleCompilerOutput, Record<string, string>[]] {
	let compilation: Record<string, string> = {};
	const compilations: Record<string, string>[] = [];

	return [
		{
			emit(filename: string, data: string) {
				compilation[path.relative(relativeTo, filename).replace(/\\/g, "/")] = data;
			},
			done() {
				compilations.push(compilation);
				compilation = {};
			}
		},
		compilations
	];
}

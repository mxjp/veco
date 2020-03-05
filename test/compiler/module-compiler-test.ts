import test, { ExecutionContext } from "ava";
import * as path from "path";
import { ModuleCompiler } from "../../src/compiler/module-compiler";
import { createTestDir, writeFiles, wait } from "../helpers";
import { disposeAsync } from "../../src/common/disposable";

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

	const moduleCompiler = new ModuleCompiler({ cwd });
	const compilations = createCaptureOutput(t, moduleCompiler, cwd);

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

	const moduleCompiler = new ModuleCompiler({ cwd });
	const compilations = createCaptureOutput(t, moduleCompiler, cwd);

	const watching = moduleCompiler.watch();
	moduleCompiler.on("watcherError", error => t.fail(error));

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

	await disposeAsync(watching);

	t.pass();
});

test("includes and excludes specific files if configured", async t => {
	const cwd = await createTestDir(t);
	await writeFiles(cwd, {
		"foo.ts": "",
		"bar.ts": "",
		"baz.ts": ""
	});

	const moduleCompiler = new ModuleCompiler({
		cwd,
		include: ["foo*"],
		exclude: ["bar*"]
	});
	const compilations = createCaptureOutput(t, moduleCompiler, cwd);

	moduleCompiler.run();

	t.is(compilations.length, 1);
	t.is(Object.keys(compilations[0]).length, 1);
	t.true("foo.veco" in compilations[0]);
});

export function createCaptureOutput(t: ExecutionContext, source: ModuleCompiler, relativeTo: string): Record<string, string>[] {
	let compilation: Record<string, string> = {};
	const compilations: Record<string, string>[] = [];

	source.on("file", (filename, data) => {
		compilation[path.relative(relativeTo, filename).replace(/\\/g, "/")] = data;
	});

	source.on("done", (result) => {
		if (result.tsDiagnostics.length > 0) {
			throw Object.assign(new Error("unexpected ts diagnostics"), {
				diagnostics: result.tsDiagnostics
			});
		}
		compilations.push(compilation);
		compilation = {};
	});

	return compilations;
}

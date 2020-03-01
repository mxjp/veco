# VECO
A toolchain for creating **ve**ctor graphics from **co**de for developers :)

## Why?
From a developer's perspective, large sets of svg icons are hard to create and maintain as
even modern graphic software makes it hard to reuse parts or parametize things.

## How?
Veco solves this problem by allowing you to generate typed procedural svgs from code using typescript and a customized runtime:
```tsx
emit(<svg viewBox="0 0 100 100">
	{[[20, "red"], [40, "blue"], [60, "green"]].map(([radius, fill]) => {
		return <circle cx="50" cy="50" r={radius} fill={fill} />
	})}
</svg>)
```

**This is an early proof of concept. Use at your own risk!**

<br>



# Implementation Roadmap

## v1.0
+ Require **tsconfig.json** to exist.
+ Provide a utility for creating and validating the projects tsconfig.
+ Use runtime specific extensions:
	+ Use `.veco` for veco compiled modules.
	+ Fallback to node's require when `.js .mjs .cjs .node .json` files are imported.
+ Utilize typescript's watch mode.
+ Emit svgs from code to support procedural generation of svgs.
+ Api for emitting raw files to things like meta information.
+ Provide style utilities:
	+ Evaluate *jss*.
	+ or write an own solution that is simple to use.
+ Provide type declarations for the runtime.
+ Plugin API for extending the runtime for things like configuration.
+ Formatting options:
	+ Output type: `svg` | `markup`
	+ Pretty/minify
	+ Line breaks
	+ Indentation
+ Disallow async generation for now (support for promises may be added in the future).
+ Compiler functionality:
	+ `render` - For emitting svgs.
	+ `compile` - For building libraries.
+ Allow configuring veco specific settings:
	+ via `tsconfig.json`'s `veco` property
	+ via `veconf.json` files
	+ via command line.

## v1.1
+ Live preview server that hosts rendered svgs and a web client to view them.
	+ Icon selector.
	+ Allow changing preview background color.
	+ Zoom levels (`view-box`, `fit-window`, `manual`)
	+ Drag controls.
+ Build a vscode extension that uses the live preview and functions just like vscode's markdown preview.
	+ Communicate with preview web client to delegate functionality like setting background color or icon selection to vscode's native ui.
	+ When opening, show the first icon that is emitted by the file in the current open editor if any.

## v1.x
+ Strict mode to disallow non-standard elements or syntax.
+ Add an `init` command to create a new project or add the toolchain to an existing project.

## v2.x
+ Async node & attribute value support.

<br>



# Sample
The following code shows how the first version could be used:
```js
// tsconfig.json
{
	"compileOptions": {
		"target": "ES2019",
		"rootDir": "src",
		"outDir": "dist"
	},
	"include": [
		"src"
	]
}
```
```tsx
// src/icon.tsx
import { circles } from "./circles";

emit(
	<svg viewBox="0 0 100 100">
		{stylesheet({
			".pair": {
				fill: "#007fff"
			}
		})}

		{circles(50, 50, 20)}

		<circle style={{ fill: "#ff7f00" }} />
	</svg>,

	// Optional filename without extension relative to the corresponding output path:
	// - The actual extension of the emitted file depends on the compiler output type.
	"icon"
);
```
```tsx
// src/circles.tsx
export function circles(x: number, y: number, r: number) {
	return [
		<circle class="pair" cx={x + 25} cy={y + 25} r={r} />
		<circle class="pair" cx={x - 25} cy={y - 25} r={r} />
	];
}
```

### Rendering svgs
```shell
> veco render --format=pretty [--watch]
```
```xml
<!-- produces: dist/icon.svg -->
<svg>
	<style>

	</style>
</svg>
```

### Compiling a library
```shell
> veco compile [--watch]
```
Produces `.veco` and `.d.ts` files in the configured dist folder.

### Running the preview server
```shell
> veco preview --open
```

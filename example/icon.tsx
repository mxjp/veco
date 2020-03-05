/// <reference path="../runtime.d.ts"/>

emit(
	<svg viewBox="0 0 100 100">
		{[1, 2, 3, 4, 999].map(r => <circle cx="25" cy="25" r={r} fill="#007fff" />)}
	</svg>
);

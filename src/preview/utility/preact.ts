
export function toggle(value: Record<string, any>) {
	return Object.entries(value).map(([key, enabled]) => enabled ? key : "").join(" ");
}


export interface EmitMessage {
	readonly type: "emit";
	readonly moduleFilename: string;
	readonly filename: string;
	readonly data: string;
}

export interface InvalidateMessage {
	readonly type: "invalidate";
	readonly moduleFilename: string;
	readonly deleted: boolean;
}

export type Message = EmitMessage | InvalidateMessage;

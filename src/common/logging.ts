import { Emitter, Event } from "./emitter";
import { Disposable, dispose } from "./disposable";
import { inspect } from "util";
import * as colors from "ansi-colors";

export enum LogLevel {
	Debug = 0,
	Info = 1,
	Warn = 2,
	Error = 3
}

export const LOG_LEVELS = new Set<LogLevel>([
	LogLevel.Debug,
	LogLevel.Info,
	LogLevel.Warn,
	LogLevel.Error
]);

export class LogEntry {
	public constructor(
		readonly channel: string[],
		readonly level: LogLevel,
		readonly message: any[],
		readonly time = new Date()
	) {}

	public toJSON() {
		return {
			t: this.time.toISOString(),
			c: this.channel,
			l: this.level,
			m: this.message.map(value => {
				return typeof value === "string" ? value : inspect(value, false, 5, true);
			}).join(" ")
		};
	}

	public static fromJSON(data: any) {
		if (data === null
				|| typeof data !== "object"
				|| typeof data.t !== "string"
				|| !Array.isArray(data.c)
				|| !data.every((level: any) => LOG_LEVELS.has(level))
				|| typeof data.m !== "string") {
			throw new Error("invalid log entry json data");
		}
		return new LogEntry(data.c, data.l, [data.m], new Date(data.t));
	}
}

export class Log extends Emitter<{
	log: Event<[LogEntry]>
}> {
	private constructor(
		public readonly channel: string[],
		public readonly parent: Log | null
	) {
		super();
	}

	public static create() {
		return new Log([], null);
	}

	public fork(name: string) {
		return new Log(this.channel.concat(name), this);
	}

	private _log(entry: LogEntry) {
		this.emit("log", entry);
		if (this.parent !== null) {
			this.parent._log(entry);
		}
	}

	public debug(...message: any[]) {
		this._log(new LogEntry(this.channel, LogLevel.Debug, message));
	}

	public info(...message: any[]) {
		this._log(new LogEntry(this.channel, LogLevel.Info, message));
	}

	public warn(...message: any[]) {
		this._log(new LogEntry(this.channel, LogLevel.Warn, message));
	}

	public error(...message: any[]) {
		this._log(new LogEntry(this.channel, LogLevel.Error, message));
	}
}

export class LogBuffer {
	private readonly _buffer: LogEntry[] = [];
	private readonly _logSubscription: Disposable;

	public constructor(log: Log, size = 2048) {
		const buffer = this._buffer;
		this._logSubscription = log.hook("log", entry => {
			buffer.push(entry);
			if (buffer.length > size) {
				buffer.shift();
			}
		});
	}

	public tail(size = this._buffer.length) {
		return this._buffer.slice(-size);
	}

	public dispose() {
		dispose(this._logSubscription);
	}
}

export interface LogWriterOptions {
	readonly log: Log;
	readonly output: NodeJS.WriteStream;
	readonly colors?: boolean;
	readonly level?: LogLevel;
}

const LOG_LEVEL_LABELS = new Map<LogLevel, string>([
	[LogLevel.Debug, colors.gray("debug")],
	[LogLevel.Info, colors.cyan("info ")],
	[LogLevel.Warn, colors.yellow("warn ")],
	[LogLevel.Error, colors.red("error")]
]);

export class LogWriter {
	private readonly _output: NodeJS.WriteStream;
	private readonly _colors: boolean;
	private readonly _level: LogLevel;
	private readonly _logSubscription: Disposable;

	public constructor({
		log,
		output,
		colors = output.isTTY,
		level = LogLevel.Info
	}: LogWriterOptions) {
		this._output = output;
		this._colors = colors;
		this._level = level;
		this._logSubscription = log.hook("log", this.write.bind(this));
	}

	protected formatTime(time: Date) {
		return `${
			String(time.getUTCHours()).padStart(2, "0")
		}:${
			String(time.getUTCMinutes()).padStart(2, "0")
		}:${
			String(time.getUTCSeconds()).padStart(2, "0")
		}`;
	}

	protected formatLevel(level: LogLevel) {
		return LOG_LEVEL_LABELS.get(level)!;
	}

	protected formatChannel(channel: string[]) {
		return channel.join("/");
	}

	protected formatMessage(message: any[]) {
		return message.map(value => {
			return typeof value === "string" ? value : inspect(value, false, 15, true);
		}).join(" ");
	}

	protected format(entry: LogEntry) {
		const level = this.formatLevel(entry.level);
		const time = this.formatTime(entry.time);
		const channel = this.formatChannel(entry.channel);
		return `[${level} ${time}${channel ? " " + channel : ""}] ${this.formatMessage(entry.message)}`;
	}

	protected write(entry: LogEntry) {
		if (entry.level < this._level) {
			return;
		}
		let line = this.format(entry);
		if (!this._colors) {
			line = colors.strip(line);
		}
		this._output.write(line, "utf8");
	}

	public dispose() {
		dispose(this._logSubscription);
	}
}

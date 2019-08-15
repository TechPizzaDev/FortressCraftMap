import TimeEvent from "./TimeEvent";

export type TimedCallback = (time: TimeEvent) => void;

export default class FrameDispatcher {
	private _update: TimedCallback;
	private _draw: TimedCallback;
	
	private _cachedAnimationCallback: (totalTime: number) => void;
	private _animationID: number;
	private _lastTime: number;
	private _totalTime = 0;
	private _trueTotalTime = 0;

	constructor(update: TimedCallback, draw: TimedCallback) {
		this._update = update;
		this._draw = draw;

		this._cachedAnimationCallback = this.animationCallback;
	}

	public run() {
		if (this._animationID)
			throw new Error("The dispatcher is already running.");

		if (!this._animationID)
			this.requestFrame();
	}

	private requestFrame() {
		this._animationID = requestAnimationFrame(this._cachedAnimationCallback);
	}

	private animationCallback = (totalTime: number) => {
		if (this._lastTime) {
			const ev = new TimeEvent(
				(totalTime - this._lastTime) / 1000,
				this._trueTotalTime,
				this._totalTime);

			this._update(ev);
			this._draw(ev);
			this._totalTime += ev.delta;
			this._trueTotalTime += ev.animationDelta;
		}
		this._lastTime = totalTime;
		this.requestFrame();
	}
}

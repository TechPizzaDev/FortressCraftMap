import TimeEvent from "./TimeEvent";

export type TimedCallback = (time: TimeEvent) => void;

export default class FrameDispatcher {
	private _update: TimedCallback;
	private _draw: TimedCallback;
	
	private _cachedAnimationCallback: (totalTime: number) => void;
	private _animationID: number;
	private _lastTime: number;
	private _totalTime: number;

	constructor(update: TimedCallback, draw: TimedCallback) {
		this._update = update;
		this._draw = draw;
		this._totalTime = 0;

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
			const delta = (totalTime - this._lastTime) / 1000;
			const te = new TimeEvent(delta, this._totalTime);
			this._update(te);
			this._draw(te);
			this._totalTime += delta;
		}
		this._lastTime = totalTime;
		this.requestFrame();
	}
}

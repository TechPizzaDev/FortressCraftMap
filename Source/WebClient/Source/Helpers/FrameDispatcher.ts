import TimingEvent from "./TimingEvent";

export type TimingCallback = (t: TimingEvent) => void;

export default class FrameDispatcher {
	private _update: TimingCallback;
	private _draw: TimingCallback;
	private _animationID: number;
	private _lastTime: number;
	private _totalTime: number;

	constructor(update: TimingCallback, draw: TimingCallback) {
		this._update = update;
		this._draw = draw;
		this._totalTime = 0;
	}

	public run() {
		if (this._animationID)
			throw new Error("Dispatcher is already running.");
		this.requestFrame();
	}

	private requestFrame() {
		if (this._animationID != 0)
			this._animationID = requestAnimationFrame(this.animationFrame);
	}

	private animationFrame = (totalTime: number) => {
		if (this._lastTime) {
			const delta = (totalTime - this._lastTime) / 1000;
			const te = new TimingEvent(delta, this._totalTime);
			this._update(te);
			this._draw(te);
			this._totalTime += delta;
		}
		this._lastTime = totalTime;
		this.requestFrame();
	}
}

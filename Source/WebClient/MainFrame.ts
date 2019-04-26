type TimingCallback = (t: Timing) => void;

class FrameDispatcher {
	private _update: TimingCallback;
	private _interval: number;
	private _intervalID: number;
	private _totalUpdateTime: number;
	private _firstUpdateFired: boolean;

	private _draw: TimingCallback;
	private _animationID: number;
	private _lastDrawTime: number;
	private _totalDrawTime: number;

	constructor(updateRate: number, update: TimingCallback, draw: TimingCallback) {
		this._interval = Math.round(1.0 / updateRate);
		this._update = update;
		this._draw = draw;
	}

	public run() {
		this._intervalID = setInterval(() => this.timerHandler(this), this._interval * 1000, this);
	}

	private animate() {
		this._animationID = requestAnimationFrame((t) => this.animationFrame(this, t));
	}

	private timerHandler(fd: FrameDispatcher) {
		if (!fd._firstUpdateFired)
			fd._firstUpdateFired = true;

		fd._update(new Timing(fd._interval, fd._totalUpdateTime));
		fd._totalUpdateTime += fd._interval;
	}

	private animationFrame(fd: FrameDispatcher, totalTime: number) {
		if (totalTime) {
			const delta = (totalTime - fd._lastDrawTime) / 1000;
			fd._lastDrawTime = totalTime;

			if (fd._firstUpdateFired) {
				fd._draw(new Timing(delta, fd._totalDrawTime));
				fd._totalDrawTime += delta;
			}
		}
		fd.animate();
	}
}

class MainFrame {
	private _gl: GLContext;
	private _frameDispatcher: FrameDispatcher;

	constructor(gl: GLContext) {
		if (!gl)
			throw new TypeError("GL Context is undefined.");

		this._gl = gl;
		this._frameDispatcher = new FrameDispatcher(20, this.update, this.draw);
	}

	public get gl(): GLContext {
		return this._gl;
	}

	public run() {
		this.onResize();
		window.addEventListener("resize", this.onResize);

		this._frameDispatcher.run();
	}

	public update(time: Timing) {
		
	}

	public draw(time: Timing) {

	}

	private onResize() {

	}
}

abstract class RendererBase {
	public readonly gl: GLContext;

	constructor(gl: GLContext) {
		if (!gl)
			throw new TypeError("GL Context is undefined.");
		this.gl = gl;
	}

	abstract draw(time: Timing): void;
}

class SegmentRenderer extends RendererBase{
	constructor(gl: GLContext) {
		super(gl);
	}

	draw(time: Timing): void {


		
	}
}

// this should run in a Worker
class MeshGenerator {

}
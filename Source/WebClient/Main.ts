
class FrameDispatcher {
	private _interval: number;
	private _update: Function;
	private _draw: Function;
	private _intervalID: number;
	private _animationID: number;

	private _updateTime: Timing;

	private _lastTime: number;
	private _drawTime: Timing;

	constructor(updateRate: number, update: Function, draw: Function) {
		this._interval = Math.round(1.0 / updateRate * 1000);
		this._update = update;
		this._draw = draw;
	}

	timerHandler() {
		this._update(this._updateTime);
	}

	animationFrame(totalTime: number) {
		if (totalTime) {
			this._drawTime.delta = (totalTime - this._lastTime) / 1000;
			this._lastTime = totalTime;
		}
		this._lastTime = totalTime;
		this._drawTime.total += this._drawTime.delta;
		this._draw(this._drawTime);

		this.animate();
	}

	public run() {
		this._updateTime = new Timing();
		this._drawTime = new Timing();

		this._intervalID = setInterval(this.timerHandler, this._interval);

		this.animate();
	}

	private animate() {
		this._animationID = requestAnimationFrame(this.animationFrame);
	}
}

class MainFrame {
	public readonly gl: GLContext;
	private _frameDispatcher: FrameDispatcher;

	constructor(gl: GLContext) {
		if (!gl)
			throw new TypeError("GL Context is undefined.");

		this.gl = gl;
		this._frameDispatcher = new FrameDispatcher(20, update, draw);
	}

	public update(time: Timing) {

	}

	public draw(time: Timing) {

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
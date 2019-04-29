import TimingEvent from "../Helpers/TimingEvent";
import { Size } from "../Helpers/Size";

abstract class RendererBase {
	public readonly gl: GLContext;

	constructor(gl: GLContext) {
		if (!gl)
			throw new TypeError("GL Context is undefined.");
		this.gl = gl;
	}

	public onResize(size: Size) {
	}

	public abstract draw(time: TimingEvent): void;
}
export default RendererBase;
import TimedEvent from "../../Utility/TimingEvent";
import { Rectangle } from "../../Utility/Shapes";
import GLResource from "../GLResource";

/**
 * The base for various GL renderers.
 * */
export default abstract class RendererBase extends GLResource {

	/**
	 * Constructs the renderer.
	 * @param gl The GL context.
	 */
	constructor(gl: WebGLRenderingContext) {
		super(gl);
	}

	/**
	 * Called every time the viewport is changed.
	 * @param rectangle The new viewport.
	 */
	public abstract onViewportChanged(rectangle: Rectangle): void;

	/**
	 * C
	 * @param time The timing information for the current frame.
	 */
	public abstract draw(time: TimedEvent): void;
}
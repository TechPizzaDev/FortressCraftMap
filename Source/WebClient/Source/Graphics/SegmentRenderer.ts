import MainFrame from "../Core/MainFrame";
import RendererBase from "./RendererBase";
import TimingEvent from "../Helpers/TimingEvent";
import { Size } from "../Helpers/Size";

export default class SegmentRenderer extends RendererBase {
	constructor(frame: MainFrame) {
		super(frame.gl);
	}

	public onResize(size: Size) {

	}

	public draw(time: TimingEvent): void {

	}
}
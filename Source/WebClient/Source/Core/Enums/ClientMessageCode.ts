
/**
 * Message codes that the clients sends to the server.
 * */
const enum ClientMessageCode {

	/** Small request message for a segment. */
	GetSegment,

	/** Request message for multiple segments. */
	GetSegmentBatch,
}

/**
 *  Message codes that the server sends to the client.
 * */
const enum ServerMessageCode {

	/** Large message containing segment data. */
	Segment,

	/** Message containing data of multiple segments. */
	SegmentBatch,

	/** Small message containing one block update. */
	BlockOrder,

	/** Message containing multiple block updates. */
	BlockOrderBatch
}
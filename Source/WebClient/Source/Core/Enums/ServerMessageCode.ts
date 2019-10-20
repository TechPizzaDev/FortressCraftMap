
/**
 *  Message codes that the server sends to the client.
 * */
const enum ServerMessageCode {

    Reserved = 0,

    StringCode = 1,

	Error = 2,

	/** Large message containing segment data. */
	Segment,

	/** Message containing data of multiple segments. */
	SegmentBatch,

	/** Small message containing one block update. */
	BlockOrder,

	/** Message containing multiple block updates. */
	BlockOrderBatch
}
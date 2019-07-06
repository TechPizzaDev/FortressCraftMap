
/**
 *  Message codes that the server sends to the client.
 * */
const enum ServerMessageCode {

	/** Large message containing full segment data. */
	Segment,

	/** Small message containing one block update. */
	BlockOrder,

	/** Message containing multiple block updates. */
	BlockOrders
}
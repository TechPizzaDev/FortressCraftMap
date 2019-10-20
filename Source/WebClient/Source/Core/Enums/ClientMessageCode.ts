
/**
 * Message codes that the clients sends to the server.
 * */
const enum ClientMessageCode {

    Reserved = 0,

    StringCode = 1,

    Error = 2,

    /** Small request message for a segment. */
    GetSegment,

    /** Request message for multiple segments. */
    GetSegmentBatch,
}
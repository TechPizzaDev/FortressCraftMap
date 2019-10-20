import * as jDataView from "jdataview";

export interface Decoded7BitInt32 {
    value: number;
    bytesRead: number;
}

export default class jDataViewExtensions {

    public static get7BitEncodedInt(view: jDataView, offset?: number): Decoded7BitInt32 {
        const originOffset = view.tell();
        if (!offset)
            offset = originOffset;

        // Read out an Int32 7 bits at a time.
        // The high bit of the byte, when on, means to continue reading more bytes.
        let count = 0;
        let shift = 0;
        let b: number;
        do {
            // Check for a corrupted stream. Read a max of 5 bytes.
            if (shift == 5 * 7)  // 5 bytes max per Int32, shift += 7
                throw new Error("Invalid 7-bit encoded integer.");

            // getUint8 handles end of stream cases for us.
            b = view.getUint8();
            count |= (b & 0x7F) << shift;
            shift += 7;
        } while ((b & 0x80) != 0);

        const bytesRead = view.tell() - originOffset;
        return { value: count, bytesRead };
    }

    public static write7BitEncodedInt(view: jDataView, value: number) {
        // Write out an int 7 bits at a time.
        // The high bit of the byte, when on, tells reader to continue reading more bytes.
        let v = value;
        while (v >= 0x80) {
            view.writeUint8((v | 0x80) % 256);
            v >>= 7;
        }
        view.writeUint8(v);
    }

    public static getDotNetString(view: jDataView, offset?: number) {
        if (!offset)
            offset = view.tell();

        const decoded = jDataViewExtensions.get7BitEncodedInt(view, offset);
        return view.getString(decoded.value, offset + decoded.bytesRead, "utf8");
    }

    public static writeDotNetString(view: jDataView, chars: string, encoding?: string) {
        jDataViewExtensions.write7BitEncodedInt(view, chars.length);
        view.writeString(chars, encoding);
    }
}
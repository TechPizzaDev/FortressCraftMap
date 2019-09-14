
/**
 * Contains debug information that is updated once per second.
 * */
export interface SlowInformation {
	segmentRequests: number;
}

export const EmptySlow: SlowInformation = {
	segmentRequests: 0
}

/**
 * Contains debug information that is updated more than once per second.
 * */
export interface FastInformation {
	segmentsBuilt: number;
	segmentBatchesBuilt: number;
}

export const EmptyFast: FastInformation = {
	segmentsBuilt: 0,
	segmentBatchesBuilt: 0
};

/**
 * Contains debug information combined from slow and fast information.
 * */
export interface Information extends SlowInformation, FastInformation {
}

export const Empty: Information = Object.assign({}, EmptySlow, EmptyFast);
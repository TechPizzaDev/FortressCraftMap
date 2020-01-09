
/**
 * Contains debug information that is updated once per second.
 * */
export interface InfrequentInformation {
	segmentRequests: number;
}

export const EmptySlow: InfrequentInformation = {
	segmentRequests: 0
}

/**
 * Contains debug information that is updated more than once per second.
 * */
export interface FrequentInformation {
	segmentsBuilt: number;
	segmentBatchesBuilt: number;
}

export const EmptyFast: FrequentInformation = {
	segmentsBuilt: 0,
	segmentBatchesBuilt: 0
};

/**
 * Contains debug information combined from slow and fast information.
 * */
export interface Information extends InfrequentInformation, FrequentInformation {
}

export const Empty: Information = Object.assign({}, EmptySlow, EmptyFast);
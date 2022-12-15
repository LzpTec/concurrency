export interface BatchOptions {
    /**
     * Batch size
     */
    batchSize: number;

    /**
     * Interval between batches(in MS)
     */
    batchInterval?: number;
}

export interface ConcurrencyOptions {
    /**
     * Max concurrency
     */
    maxConcurrency: number;

    /**
     * Interval between jobs(in MS)
     */
    concurrencyInterval?: number;
}

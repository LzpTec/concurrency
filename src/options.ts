import type { Task } from './types';

export interface BatchCommonOptions {
    /**
     * Batch size
     */
    batchSize: number;

    /**
     * Interval between batches(in MS)
     */
    batchInterval?: number;
}

export interface BatchTaskOptions<A, B> extends BatchCommonOptions {
    /**
     * The task to run for each item.
     */
    task: Task<A, B>;
}

export interface BatchFilterOptions<A> extends BatchCommonOptions {
    /**
     * The filter method calls the predicate function one time for each element in the array.
     */
    predicate: Task<A, boolean>;
}

export interface ConcurrencyCommonOptions {
    /**
     * Max concurrency
     */
    maxConcurrency: number;

    /**
     * Interval between jobs(in MS)
     */
    concurrencyInterval?: number;
}

export interface ConcurrencyTaskOptions<A, B> extends ConcurrencyCommonOptions {
    /**
     * The task to run for each item.
     */
    task: Task<A, B>;
}

export interface ConcurrencyFilterOptions<A> extends ConcurrencyCommonOptions {
    /**
     * The filter method calls the predicate function one time for each element in the array.
     */
    predicate: Task<A, boolean>;
}

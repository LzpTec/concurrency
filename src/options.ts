import type { Input, Task } from './types';

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
     * Arguments to pass to the task for each call.
     */
    input: Input<A>;

    /**
     * The task to run for each item.
     */
    task: Task<A, B>;
}

export interface BatchPredicateOptions<A> extends BatchCommonOptions {
    /**
     * Arguments to pass to the predicate for each call.
     */
    input: Input<A>;

    /**
     * The predicate function is called one time for each element in the `input`.
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
     * Arguments to pass to the task for each call.
     */
    input: Input<A>;

    /**
     * The task to run for each item.
     */
    task: Task<A, B>;
}

export interface ConcurrencyPredicateOptions<A> extends ConcurrencyCommonOptions {
    /**
     * Arguments to pass to the predicate for each call.
     */
    input: Input<A>;

    /**
     * The predicate function is called one time for each element in the `input`.
     */
    predicate: Task<A, boolean>;
}

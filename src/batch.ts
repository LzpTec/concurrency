import { Queue } from './collections';
import type { BatchCommonOptions, BatchPredicateOptions, BatchTaskOptions } from './options';
import { SharedBase } from './shared-base';
import type { Job, RunnableTask } from './types';

export class Batch extends SharedBase<BatchCommonOptions> {

    /**
     * Performs the specified `task` for each element in the `input`.
     * 
     * It runs in batches with size defined by `batchSize`.
     *
     * @template A Input Type.
     * @param {BatchTaskOptions<A, any>} taskOptions Task Options.
     * @returns {Promise<void>}
     */
    static async forEach<A>(taskOptions: BatchTaskOptions<A, any>): Promise<void> {
        return new Batch(taskOptions).forEach(taskOptions.input, taskOptions.task);
    }

    /**
     * Performs the specified `task` function on each element in the `input`, and returns an array that contains the results.
     * 
     * It runs in batches with size defined by `batchSize`.
     * 
     * @template A Input Type.
     * @template B Output Type.
     * @param {BatchTaskOptions<A, B>} taskOptions Task Options.
     * @returns {Promise<B[]>}
     */
    static async map<A, B>(taskOptions: BatchTaskOptions<A, B>): Promise<B[]> {
        return new Batch(taskOptions).map(taskOptions.input, taskOptions.task);
    }

    /**
     * Performs the specified `task` function on each element in the `input`, 
     * and creates a Promise that is resolved with an array of results when all of the tasks are resolve or reject.
     * 
     * It runs in batches with size defined by `batchSize`.
     * 
     * @template A Input Type.
     * @template B Output Type.
     * @param {BatchTaskOptions<A, B>} taskOptions Task Options.
     * @returns {Promise<PromiseSettledResult<B>[]>}
     */
    static async mapSettled<A, B>(taskOptions: BatchTaskOptions<A, B>): Promise<PromiseSettledResult<B>[]> {
        return new Batch(taskOptions).mapSettled(taskOptions.input, taskOptions.task);
    }

    /**
     * Returns the elements that meet the condition specified in the `predicate` function.
     * 
     * It runs in batches with size defined by `batchSize`.
     *
     * @template A Input Type.
     * @param {BatchPredicateOptions<A>} taskOptions Task Options.
     * @returns {Promise<A[]>}
     */
    static async filter<A>(taskOptions: BatchPredicateOptions<A>): Promise<A[]> {
        return new Batch(taskOptions).filter(taskOptions.input, taskOptions.predicate);
    }

    /**
     * Determines whether the specified `predicate` function returns true for any element of `input`.
     * 
     * It runs in batches with size defined by `batchSize`.
     * 
     * @template A Input Type.
     * @param {BatchPredicateOptions<A>} taskOptions Task Options.
     * @returns {Promise<boolean>}
     */
    static async some<A>(taskOptions: BatchPredicateOptions<A>): Promise<boolean> {
        return new Batch(taskOptions).some(taskOptions.input, taskOptions.predicate);
    }

    /**
     * Returns the `input` value of the first `predicate` that resolves to true, and undefined otherwise.
     * 
     * It runs in batches with size defined by `batchSize`.
     * 
     * @template A Input Type.
     * @param {BatchPredicateOptions<A>} taskOptions Task Options.
     * @returns {Promise<A | undefined>}
     */
    static async find<A>(taskOptions: BatchPredicateOptions<A>): Promise<A | undefined> {
        return new Batch(taskOptions).find(taskOptions.input, taskOptions.predicate);
    }

    /**
     * Determines whether all the elements of `input` satisfy the specified `predicate`.
     * 
     * It runs in batches with size defined by `batchSize`.
     * 
     * @template A Input Type.
     * @param {BatchPredicateOptions<A>} taskOptions Task Options.
     * @returns {Promise<boolean>}
     */
    static async every<A>(taskOptions: BatchPredicateOptions<A>): Promise<boolean> {
        return new Batch(taskOptions).every(taskOptions.input, taskOptions.predicate);
    }

    /**
     * This method groups the elements of the `input` according to the string values returned by a provided `task`.
     * 
     * The returned object has separate properties for each group, containing arrays with the elements in the group.
     * 
     * It runs in batches with size defined by `batchSize`.
     * 
     * @template A Input Type.
     * @param {BatchTaskOptions<A>} taskOptions Task Options.
     * @returns {Promise<{ [key: string | symbol]: A[] }>}
     */
    static async group<A>(taskOptions: BatchTaskOptions<A, string | symbol>): Promise<{ [key: string | symbol]: A[] }> {
        return new Batch(taskOptions).group(taskOptions.input, taskOptions.task);
    }

    #options: BatchCommonOptions;
    #queue: Queue<Job> = new Queue();
    #currentRunning: number = 0;

    /**
     * 
     * @param {BatchCommonOptions} options 
     */
    constructor(options: BatchCommonOptions) {
        super();
        this.options = options;
    }

    #runJob<T>(task: () => Promise<T> | T): Promise<T> {
        const job = new Promise<T>((resolve, reject) => this.#queue.enqueue({ task, resolve, reject }));
        if (!this._isFull) {
            this.#run();
        }
        return job;
    }

    async #run() {
        let jobs = [];

        while (!this.#queue.isEmpty()) {
            const job = this.#queue.dequeue()!;

            jobs[this.#currentRunning++] = Promise
                .resolve(job.task())
                .then(res => job.resolve(res))
                .catch(err => job.reject(err));

            if (this.#currentRunning >= this.#options.batchSize) {
                await Promise.all(jobs);
                jobs = [];

                if (typeof this.#options.batchInterval === 'number' && this.#options.batchInterval > 0) {
                    await new Promise<void>((resolve) => setTimeout(() => resolve(), this.#options.batchInterval));
                }

                this.#currentRunning = 0;
                this._waitEvent.emit();
            }

            await Promise.resolve();
        }

        await Promise.all(jobs);
    }

    override async run<A, B>(task: RunnableTask<A, B>, ...args: A[]): Promise<B> {
        return await this.#runJob(() => task(...args));
    }

    override set options(options: BatchCommonOptions) {
        if (!Number.isInteger(options.batchSize)) {
            throw new Error('Parameter `batchSize` invalid!');
        }

        if (typeof options.batchInterval === 'number') {
            if (isNaN(options.batchInterval)) {
                throw new Error('Parameter `batchInterval` invalid!');
            }

            if (options.batchInterval < 0) {
                throw new Error('Parameter `batchInterval` must be a positive number!');
            }
        } else {
            options.batchInterval = void 0;
        }

        this.#options = { ...this.#options, ...options};
    }

    override get _isFull(): boolean {
        return this.#currentRunning >= this.#options.batchSize;
    }

}

Object.freeze(Batch);

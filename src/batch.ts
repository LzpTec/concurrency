import type { BatchCommonOptions, BatchPredicateOptions, BatchTaskOptions } from './options';
import { Queue } from './queue';
import { SharedBase, interrupt, max, processTaskInput } from './shared-base';
import type { Input, Job, RunnableTask, Task } from './types';

export class Batch extends SharedBase<BatchCommonOptions> {

    #options: BatchCommonOptions;
    #jobs: Promise<void>[] = [];
    #isRunning: boolean = false;
    #queue: Queue<Job<any>> = new Queue();

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

    /**
     * 
     * @param {BatchCommonOptions} options 
     */
    constructor(options: BatchCommonOptions) {
        super();
        this.options = options;
    }

    async #run() {
        if (this.#isRunning) return;
        this.#isRunning = true;

        while (this.#queue.length) {
            const job = this.#queue.shift()!;

            const p = Promise
                .resolve(job.task(...job.args))
                .then(job.resolve)
                .catch(job.reject);

            const length = this.#jobs.push(p);
            if (length >= this.#options.batchSize) {
                await Promise.all(this.#jobs);
                this.#jobs.length = 0;
            }

            if (typeof this.#options.batchInterval === 'number' && this.#options.batchInterval > 0) {
                await new Promise<void>((resolve) => setTimeout(() => resolve(), this.#options.batchInterval));
            }
        }

        this.#isRunning = false;
    }

    override run<A, B>(task: RunnableTask<A, B>, ...args: A[]): Promise<B> {
        const job = new Promise<B>((resolve, reject) => {
            this.#queue.push({ task, resolve, reject, args });
            this.#run();
        });
        return job;
    }

    override async forEach<A>(input: Input<A>, task: Task<A, any>): Promise<void> {
        const iterator = processTaskInput(input, task);

        let done = false;
        const jobCount = this[max];

        const catchAndAbort = (err: any) => {
            done = true;
            throw err;
        };

        const promises: Promise<any>[] = new Array(jobCount);
        for (let i = 0, size = jobCount; i < size; i++) {
            promises[i] = (async () => {
                let res = await iterator.next();

                while (!done && !res.done) {
                    await this.run(async () => {
                        const result = await task(await res.value);
                        if (result === interrupt) {
                            done = true;
                            iterator.return?.();
                        }
                    }).catch(catchAndAbort);

                    res = await iterator.next();
                }
            })().catch(catchAndAbort);
        }

        await Promise.all(promises);
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

        this.#options = { ...this.#options, ...options };
    }

    override get [max]() {
        return this.#options.batchSize;
    }

}

Object.freeze(Batch);

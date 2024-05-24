import type { BatchCommonOptions, BatchPredicateOptions, BatchTaskOptions } from './options';
import { Queue } from './queue';
import { SharedBase, validateAndProcessInput, validatePredicate, validateTask } from './shared-base';
import { every, filter, find, group, interrupt, loop, map, mapSettled, some } from './shared';
import type { Input, Job, RunnableTask, Task } from './types';

export class Batch extends SharedBase<BatchCommonOptions> {

    #options: BatchCommonOptions;
    #isRunning: boolean = false;
    #queue: Queue<Job<any>> = new Queue();

    static async #loop<A, B>(taskOptions: BatchTaskOptions<A, B>) {
        const iterator = validateAndProcessInput(taskOptions.input);

        const promises: Promise<void>[] = new Array(taskOptions.batchSize);
        let done = false;

        while (!done) {
            for (let i = 0; i < taskOptions.batchSize; i++) {
                promises[i] = (async () => {
                    const data = await iterator.next();
                    if (done || data.done) {
                        done = true;
                        return;
                    }

                    const result = await taskOptions.task(await data.value);
                    if (result === interrupt) {
                        done = true;
                        iterator.return?.();
                    }
                })();
            }
            await Promise.all(promises);
        }

        await Promise.all(promises);
    }

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
        validateTask(taskOptions.task);
        return this.#loop(taskOptions);
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
        validateTask(taskOptions.task);

        const results: B[] = new Array();

        await this.
            #loop({
                ...taskOptions,
                task: (item) => map(results, item, taskOptions.task)
            });

        return results;
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
        validateTask(taskOptions.task);

        const results: PromiseSettledResult<B>[] = new Array();

        await this
            .#loop({
                ...taskOptions,
                task: (item) => mapSettled(results, item, taskOptions.task)
            });

        return results;
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
        validatePredicate(taskOptions.predicate);

        const results: A[] = new Array();

        await this
            .#loop({
                ...taskOptions,
                task: (item) => filter(results, item, taskOptions.predicate)
            });

        return results;
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
        validatePredicate(taskOptions.predicate);

        const result = { value: false };

        await this
            .#loop({
                ...taskOptions,
                task: (item) => some(result, item, taskOptions.predicate)
            });

        return result.value;
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
        validatePredicate(taskOptions.predicate);

        const result = { value: undefined };

        await this
            .#loop({
                ...taskOptions,
                task: (item) => find(result, item, taskOptions.predicate)
            });

        return result.value;
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
        validatePredicate(taskOptions.predicate);

        const result = { value: true };

        await this
            .#loop({
                ...taskOptions,
                task: (item) => every(result, item, taskOptions.predicate)
            });

        return result.value;
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
        validateTask(taskOptions.task);

        const result = new Map<string | symbol, A[]>();

        await this
            .#loop({
                ...taskOptions,
                task: (item) => group(result, item, taskOptions.task)
            });

        return Object.fromEntries(result);
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
        while (this.#queue.length) {
            const jobCount = this.#options.batchSize;
            const promises: Promise<void>[] = new Array(jobCount);

            for (let i = 0; i < jobCount; i++) {
                promises[i] = (async () => {
                    const job = this.#queue.shift();
                    if (!job)
                        return;

                    try {
                        const result = await job.task(...job.args);
                        job.resolve(result);
                    } catch (err) {
                        job.reject(err);
                    }
                })();
            }
            await Promise.all(promises);

            if (typeof this.#options.batchInterval === 'number' && this.#options.batchInterval > 0) {
                await new Promise<void>((resolve) => setTimeout(() => resolve(), this.#options.batchInterval));
            }
        }

        this.#isRunning = false;
    }

    override run<A, B>(task: RunnableTask<A, B>, ...args: A[]): Promise<B> {
        const job = new Promise<B>((resolve, reject) => {
            this.#queue.push({ task, resolve, reject, args });

            if (this.#isRunning) return;
            this.#isRunning = true;
            this.#run();
        });
        return job;
    }

    override async [loop]<A, B>(input: Input<A>, task: Task<A, B>): Promise<void> {
        const iterator = validateAndProcessInput(input);

        let done = false;
        const jobCount = this.#options.batchSize;

        const catchAndAbort = (err: any) => {
            done = true;
            throw err;
        };

        const promises: Promise<any>[] = new Array(jobCount);
        for (let i = 0, size = jobCount; i < size; i++) {
            promises[i] = Promise
                .resolve(iterator.next())
                .then(async res => {
                    while (!done && !res.done) {
                        await Promise
                            .resolve(res.value)
                            .then(args => new Promise<B>((resolve, reject) => {
                                this.#queue.push({ task, resolve, reject, args: [args] });
                                if (this.#isRunning) return;
                                this.#isRunning = true;
                                this.#run();
                            }));

                        res = await iterator.next();
                    }
                })
                .catch(catchAndAbort);
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

    override get options() {
        return { ...this.#options };
    }

}

Object.freeze(Batch);

import type { BatchCommonOptions, BatchPredicateOptions, BatchTaskOptions } from './base/options';
import { Queue } from './base/queue';
import { SharedBase, validateAndProcessInput, validatePredicate, validateTask } from './base/shared-base';
import { every, filter, find, group, interrupt, loop, map, mapSettled, some } from './base/shared';
import type { Input, RunnableTask, Task } from './base/types';

function validateOptions(options: BatchCommonOptions) {
    if (!Number.isInteger(options.batchSize) || options.batchSize < 0) {
        throw new Error('Parameter `batchSize` must be a positive integer greater than 0!');
    }

    if (typeof options.batchInterval === 'number') {
        if (isNaN(options.batchInterval)) {
            throw new Error('Parameter `batchInterval` invalid!');
        }

        if (options.batchInterval < 0) {
            throw new Error('Parameter `batchInterval` must be a positive number!');
        }
    }
}

export class Batch extends SharedBase<BatchCommonOptions> {

    #options: BatchCommonOptions;
    #isRunning: boolean = false;
    #queue: Queue<() => Promise<void>> = new Queue();

    static async #loop<A, B>(taskOptions: BatchTaskOptions<A, B>) {
        validateOptions(taskOptions);
        const iterator = validateAndProcessInput(taskOptions.input);
        const { batchSize, batchInterval, task } = taskOptions;
        let done = false;

        while (!done) {
            await new Promise<void>((resolve, reject) => {
                for (let i = 0; i < batchSize; i++) {
                    (async () => {
                        const data = await iterator.next();
                        done = done || !!data.done;
                        if (done) return;

                        const result = await task(await data.value);
                        if (result === interrupt) {
                            done = true;
                            iterator.return?.();
                        }
                    })()
                        .then(() => (--i === 0) ? resolve() : undefined)
                        .catch(reject);
                }
            });

            if (typeof batchInterval === 'number')
                await new Promise<void>((resolve) => setTimeout(resolve, batchInterval));
        }
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
        const task = map(results, taskOptions.task);

        await this.
            #loop({
                ...taskOptions,
                task
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
        const task = mapSettled(results, taskOptions.task);

        await this
            .#loop({
                ...taskOptions,
                task
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
        const task = filter(results, taskOptions.predicate);

        await this
            .#loop({
                ...taskOptions,
                task
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
        const task = some(result, taskOptions.predicate);

        await this
            .#loop({
                ...taskOptions,
                task
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
        const task = find(result, taskOptions.predicate);

        await this
            .#loop({
                ...taskOptions,
                task
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
        const task = every(result, taskOptions.predicate);

        await this
            .#loop({
                ...taskOptions,
                task
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
        const task = group(result, taskOptions.task);

        await this
            .#loop({
                ...taskOptions,
                task
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
        const { batchSize, batchInterval } = this.#options;

        while (this.#queue.length) {
            await new Promise<void>((resolve, reject) => {
                for (let i = 0; i < batchSize; i++) {
                    queueMicrotask(async () => {
                        try {
                            const job = this.#queue.dequeue();
                            if (!job) return;

                            await job();
                            if (--i === 0) resolve()
                        } catch (err) {
                            reject(err);
                        }
                    });
                }
            });

            if (typeof batchInterval === 'number') {
                await new Promise<void>((resolve) => setTimeout(() => resolve(), batchInterval));
            }
        }
    }

    override run<A, B>(task: RunnableTask<A, B>, ...args: A[]): Promise<B> {
        const job = new Promise<B>((resolve, reject) => {
            const callback = () => Promise.resolve(task(...args))
                .then(resolve)
                .catch(reject);

            this.#queue.enqueue(callback);
            if (this.#isRunning) return;
            this.#isRunning = true;
            queueMicrotask(() => this.#run().then(() => this.#isRunning = false));
        });
        return job;
    }

    override async [loop]<A, B>(input: Input<A>, task: Task<A, B>): Promise<void> {
        const iterator = validateAndProcessInput(input);

        let done = false;
        const { batchSize } = this.#options;

        await new Promise<void>((resolve, reject) => {
            for (let i = 0; i < batchSize; i++) {
                Promise
                    .resolve(iterator.next())
                    .then(async res => {
                        while (!done && !res.done) {
                            await this.run(task, await res.value);
                            res = await iterator.next();
                        }
                    })
                    .then(() => (--i === 0) ? resolve() : undefined)
                    .catch(() => { done = true; reject(); });
            }
        });
    }

    override set options(options: BatchCommonOptions) {
        validateOptions(options);
        this.#options = { ...this.#options, ...options };
    }

    override get options() {
        return { ...this.#options };
    }

}

Object.freeze(Batch);

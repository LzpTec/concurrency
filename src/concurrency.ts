import type { ConcurrencyCommonOptions, ConcurrencyPredicateOptions, ConcurrencyTaskOptions } from './options';
import { Queue } from './queue';
import { every, filter, find, group, interrupt, loop, map, mapSettled, some } from './shared';
import { SharedBase, validateAndProcessInput, validatePredicate, validateTask } from './shared-base';
import type { Input, RunnableTask, Task } from './types';

function validateOptions(options: ConcurrencyCommonOptions) {
    if (!Number.isInteger(options.maxConcurrency) || options.maxConcurrency < 0) {
        throw new Error('Parameter `maxConcurrency` must be a positive integer greater than 0!');
    }

    if (typeof options.concurrencyInterval === 'number') {
        if (isNaN(options.concurrencyInterval)) {
            throw new Error('Parameter `concurrencyInterval` invalid!');
        }

        if (options.concurrencyInterval < 0) {
            throw new Error('Parameter `concurrencyInterval` must be a positive number!');
        }
    }
}

export class Concurrency extends SharedBase<ConcurrencyCommonOptions> {

    #options: ConcurrencyCommonOptions;
    #currentRunning: number = 0;
    #queue: Queue<() => Promise<void>> = new Queue();
    #promise = Promise.resolve();

    static async #loop<A, B>(taskOptions: ConcurrencyTaskOptions<A, B>) {
        validateOptions(taskOptions);
        const { input, maxConcurrency, concurrencyInterval, task } = taskOptions;
        const iterator = validateAndProcessInput(input);
        let done = false;

        await new Promise<void>((resolve, reject) => {
            for (let i = 0; i < maxConcurrency; i++) {
                (async () => {
                    while (!done) {
                        const data = await iterator.next();
                        if (done || data.done) {
                            done = true;
                            return;
                        }

                        const result = await task(await data.value);
                        if (result === interrupt) {
                            done = true;
                            iterator.return?.();
                            break;
                        }

                        if (typeof concurrencyInterval === 'number') {
                            await new Promise<void>((resolve) => setTimeout(() => resolve(), concurrencyInterval));
                        }
                    }
                })()
                    .then(() => (--i === 0) ? resolve() : undefined)
                    .catch(reject);
            }
        });
    }

    /**
     * Performs the specified `task` for each element in the `input`.
     * 
     * It limits the concurrent execution to `maxConcurrency`.
     *
     * @template A
     * @param {ConcurrencyTaskOptions<A, any>} taskOptions Task Options.
     * @returns {Promise<void>}
     */
    static async forEach<A>(taskOptions: ConcurrencyTaskOptions<A, any>): Promise<void> {
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
     * @param {ConcurrencyTaskOptions<A, B>} taskOptions Task Options.
     * @returns {Promise<B[]>}
     */
    static async map<A, B>(taskOptions: ConcurrencyTaskOptions<A, B>): Promise<B[]> {
        validateTask(taskOptions.task);

        const results: B[] = new Array();
        const task = map(results, taskOptions.task);

        await this
            .#loop({
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
     * @param {ConcurrencyTaskOptions<A, B>} taskOptions Task Options.
     * @returns {Promise<PromiseSettledResult<B>[]>}
     */
    static async mapSettled<A, B>(taskOptions: ConcurrencyTaskOptions<A, B>): Promise<PromiseSettledResult<B>[]> {
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
     * @param {ConcurrencyPredicateOptions<A>} taskOptions Task Options.
     * @returns {Promise<A[]>}
     */
    static async filter<A>(taskOptions: ConcurrencyPredicateOptions<A>): Promise<A[]> {
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
     * @param {ConcurrencyPredicateOptions<A>} taskOptions Task Options.
     * @returns {Promise<boolean>}
     */
    static async some<A>(taskOptions: ConcurrencyPredicateOptions<A>): Promise<boolean> {
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
     * @param {ConcurrencyPredicateOptions<A>} taskOptions Task Options.
     * @returns {Promise<A | undefined>}
     */
    static async find<A>(taskOptions: ConcurrencyPredicateOptions<A>): Promise<A | undefined> {
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
     * @param {ConcurrencyPredicateOptions<A>} taskOptions Task Options.
     * @returns {Promise<boolean>}
     */
    static async every<A>(taskOptions: ConcurrencyPredicateOptions<A>): Promise<boolean> {
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
     * @param {ConcurrencyTaskOptions<A, string | symbol>} taskOptions Task Options.
     * @returns {Promise<{ [key: string | symbol]: A[] }>}
     */
    static async group<A>(taskOptions: ConcurrencyTaskOptions<A, string | symbol>): Promise<{ [key: string | symbol]: A[] }> {
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
     * @param {ConcurrencyCommonOptions} options 
     */
    constructor(options: ConcurrencyCommonOptions) {
        super();
        this.options = options;
    }

    async #run() {
        const { concurrencyInterval } = this.#options;
        let job;
        while (job = this.#queue.dequeue()) {
            await job();

            if (typeof concurrencyInterval === 'number') {
                await new Promise<void>((resolve) => setTimeout(() => resolve(), concurrencyInterval));
            }
        }
    }

    override run<A, B>(task: RunnableTask<A, B>, ...args: A[]): Promise<B> {
        const job = new Promise<B>((resolve, reject) => {
            const callback = () => Promise.resolve(task(...args))
                .then(resolve)
                .catch(reject);

            this.#queue.enqueue(callback);
            if (this.#currentRunning >= this.#options.maxConcurrency) return;

            this.#currentRunning++;
            this.#promise.then(() => this.#run().then(() => this.#currentRunning--));
        });
        return job;
    }

    override async [loop]<A, B>(input: Input<A>, task: Task<A, B>): Promise<void> {
        const iterator = validateAndProcessInput(input);

        let done = false;
        const { maxConcurrency } = this.#options;

        const catchAndAbort = (err: any) => {
            done = true;
            throw err;
        };

        await new Promise<void>((resolve, reject) => {
            for (let i = 0; i < maxConcurrency; i++) {
                this.run(async () => {
                    while (true) {
                        const res = await iterator.next();
                        if (res.done || done)
                            break;

                        await (async () => {
                            const result = await task(await res.value);
                            if (result === interrupt) {
                                done = true;
                                iterator.return?.();
                            }
                        })();
                    }
                })
                    .then(() => (--i === 0) ? resolve() : undefined)
                    .catch(catchAndAbort)
                    .catch(reject);
            }
        });
    }

    override set options(options: ConcurrencyCommonOptions) {
        validateOptions(options);
        this.#options = { ...this.#options, ...options };
    }

    override get options() {
        return { ...this.#options };
    }

}

Object.freeze(Concurrency);

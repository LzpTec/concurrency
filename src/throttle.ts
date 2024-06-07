import type { ThrottleCommonOptions, ThrottleTaskOptions, ThrottlePredicateOptions } from './options';
import { Queue } from './queue';
import { every, filter, find, group, interrupt, loop, map, mapSettled, some } from './shared';
import { SharedBase, validateAndProcessInput, validatePredicate, validateTask } from './shared-base';
import type { Input, RunnableTask, Task } from './types';

function validateOptions(options: ThrottleCommonOptions) {
    if (!Number.isInteger(options.maxConcurrency)) {
        throw new Error('Parameter `maxConcurrency` must be a integer!');
    }

    if (!Number.isInteger(options.interval) || options.interval < 0) {
        throw new Error('Parameter `interval` must be a positive integer greater than 0!');
    }
}

export class Throttle extends SharedBase<ThrottleCommonOptions> {
    #queue: Queue<() => Promise<void>> = new Queue();
    #currentStart = 0;
    #currentRunning = 0;

    #options: ThrottleCommonOptions;

    static async #loop<A, B>(taskOptions: ThrottleTaskOptions<A, B>) {
        // const t = new Throttle(taskOptions);
        // return t[loop](taskOptions.input, taskOptions.task);

        validateOptions(taskOptions);
        const iterator = validateAndProcessInput(taskOptions.input);

        const promises: Promise<void>[] = new Array(taskOptions.maxConcurrency);
        let done = false;

        let currentStart = performance.now();

        for (let i = 0; i < taskOptions.maxConcurrency; i++) {
            promises[i] = (async () => {
                while (!done) {
                    const data = await iterator.next();
                    if (done || data.done) {
                        done = true;
                        return;
                    }

                    const result = await taskOptions.task(await data.value);
                    if (result === interrupt) {
                        done = true;
                        iterator.return?.();
                        break;
                    }

                    const now = performance.now();
                    if ((now - currentStart) >= taskOptions.interval) {
                        currentStart = now;
                    }

                    const interval = (currentStart + taskOptions.interval) - now;
                    if (interval > 1)
                        await new Promise<void>((resolve) => setTimeout(() => resolve(), interval));
                }
            })();
        }

        await Promise.all(promises);
    }

    /**
     * Performs the specified `task` for each element in the `input`.
     * 
     * It limits the concurrent execution to `maxConcurrency`.
     *
     * @template A
     * @param {ThrottleTaskOptions<A, any>} taskOptions Task Options.
     * @returns {Promise<void>}
     */
    static async forEach<A>(taskOptions: ThrottleTaskOptions<A, any>): Promise<void> {
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
     * @param {ThrottleTaskOptions<A, B>} taskOptions Task Options.
     * @returns {Promise<B[]>}
     */
    static async map<A, B>(taskOptions: ThrottleTaskOptions<A, B>): Promise<B[]> {
        validateTask(taskOptions.task);

        const results: B[] = new Array();

        await this
            .#loop({
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
     * @param {ThrottleTaskOptions<A, B>} taskOptions Task Options.
     * @returns {Promise<PromiseSettledResult<B>[]>}
     */
    static async mapSettled<A, B>(taskOptions: ThrottleTaskOptions<A, B>): Promise<PromiseSettledResult<B>[]> {
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
     * @param {ThrottlePredicateOptions<A>} taskOptions Task Options.
     * @returns {Promise<A[]>}
     */
    static async filter<A>(taskOptions: ThrottlePredicateOptions<A>): Promise<A[]> {
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
     * @param {ThrottlePredicateOptions<A>} taskOptions Task Options.
     * @returns {Promise<boolean>}
     */
    static async some<A>(taskOptions: ThrottlePredicateOptions<A>): Promise<boolean> {
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
     * @param {ThrottlePredicateOptions<A>} taskOptions Task Options.
     * @returns {Promise<A | undefined>}
     */
    static async find<A>(taskOptions: ThrottlePredicateOptions<A>): Promise<A | undefined> {
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
     * @param {ThrottlePredicateOptions<A>} taskOptions Task Options.
     * @returns {Promise<boolean>}
     */
    static async every<A>(taskOptions: ThrottlePredicateOptions<A>): Promise<boolean> {
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
     * @param {ThrottleTaskOptions<A, string | symbol>} taskOptions Task Options.
     * @returns {Promise<{ [key: string | symbol]: A[] }>}
     */
    static async group<A>(taskOptions: ThrottleTaskOptions<A, string | symbol>): Promise<{ [key: string | symbol]: A[] }> {
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
     * @param {ThrottleCommonOptions} options 
     */
    constructor(options: ThrottleCommonOptions) {
        super();
        this.options = options;
    }

    async #run() {
        if (this.#currentRunning >= this.#options.maxConcurrency)
            return;

        this.#currentRunning++;

        let job: Function | undefined;
        while (job = this.#queue.dequeue()) {
            void job();

            const now = performance.now();
            if ((now - this.#currentStart) >= this.#options.interval) {
                this.#currentStart = now;
            }

            const interval = (this.#currentStart + this.#options.interval) - now;
            if (interval > 1)
                await new Promise<void>((resolve) => setTimeout(() => resolve(), interval));
        }
        this.#currentRunning--;
    }

    override async run<A, B>(task: RunnableTask<A, B>, ...args: A[]): Promise<B> {
        const job = new Promise<B>((resolve, reject) => {
            const callback = () => Promise.resolve(task(...args))
                .then(resolve)
                .catch(reject);

            this.#queue.enqueue(callback);
            this.#run();
        });
        return job;
    }

    override async[loop]<A, B>(input: Input<A>, task: Task<A, B>): Promise<void> {
        const iterator = validateAndProcessInput(input);

        let done = false;
        const jobCount = this.#options.maxConcurrency;

        const catchAndAbort = (err: any) => {
            done = true;
            throw err;
        };

        const promises: Promise<any>[] = new Array(jobCount);
        for (let i = 0; i < jobCount; i++) {
            promises[i] = this.run(async () => {
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
            }).catch(catchAndAbort);;
        }

        await Promise.all(promises);
    }

    override set options(options: ThrottleCommonOptions) {
        validateOptions(options);
        this.#options = { ...this.#options, ...options };
    }

    override get options() {
        return { ...this.#options };
    }

}

Object.freeze(Throttle);

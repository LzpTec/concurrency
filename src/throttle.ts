import type { ThrottleCommonOptions, ThrottleTaskOptions, ThrottlePredicateOptions } from './base/options';
import { Queue } from './base/queue';
import { every, filter, find, group, interrupt, loop, map, mapSettled, some, validateAndProcessInput, validatePredicate, validateTask } from './base/shared';
import { SharedBase } from './base/shared-base';
import type { Group, Input, RunnableTask, Task } from './base/types';

function validateOptions(options: ThrottleCommonOptions) {
    if (!Number.isInteger(options.maxConcurrency)) {
        throw new Error('Parameter `maxConcurrency` must be a integer!');
    }

    if (!Number.isInteger(options.interval) || options.interval < 0) {
        throw new Error('Parameter `interval` must be a positive integer greater than 0!');
    }
}

export class Throttle extends SharedBase<ThrottleCommonOptions> {

    #options: ThrottleCommonOptions;
    #queue: Queue<() => Promise<void>> = new Queue();
    #currentStart = 0;
    #currentRunning = 0;
    #promise = Promise.resolve();

    static async #loop<A, B>(taskOptions: ThrottleTaskOptions<A, B>) {
        validateOptions(taskOptions);
        const iterator = validateAndProcessInput(taskOptions.input);
        let done = false;

        let currentStart = performance.now();
        const { interval, maxConcurrency, task } = taskOptions;

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

                        const now = performance.now();
                        if ((now - currentStart) >= interval) {
                            currentStart = now;
                        }

                        const ms = (currentStart + interval) - now;
                        if (ms > 1)
                            await new Promise<void>((resolve) => setTimeout(() => resolve(), ms));
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

        const { task, results } = map(taskOptions.task);

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
     * @param {ThrottleTaskOptions<A, B>} taskOptions Task Options.
     * @returns {Promise<PromiseSettledResult<B>[]>}
     */
    static async mapSettled<A, B>(taskOptions: ThrottleTaskOptions<A, B>): Promise<PromiseSettledResult<B>[]> {
        validateTask(taskOptions.task);

        const { task, results } = mapSettled(taskOptions.task);

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
     * @param {ThrottlePredicateOptions<A>} taskOptions Task Options.
     * @returns {Promise<A[]>}
     */
    static async filter<A>(taskOptions: ThrottlePredicateOptions<A>): Promise<A[]> {
        validatePredicate(taskOptions.predicate);

        const { task, results } = filter(taskOptions.predicate);

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
     * @param {ThrottlePredicateOptions<A>} taskOptions Task Options.
     * @returns {Promise<boolean>}
     */
    static async some<A>(taskOptions: ThrottlePredicateOptions<A>): Promise<boolean> {
        validatePredicate(taskOptions.predicate);

        const { task, results } = some(taskOptions.predicate);

        await this
            .#loop({
                ...taskOptions,
                task
            });

        return results[0];
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

        const { task, results } = find(taskOptions.predicate);

        await this
            .#loop({
                ...taskOptions,
                task
            });

        return results[0];
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

        const { task, results } = every(taskOptions.predicate);

        await this
            .#loop({
                ...taskOptions,
                task
            });

        return results[0];
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
     * @returns {Promise<Group<A>>}
     */
    static async group<A>(taskOptions: ThrottleTaskOptions<A, string | symbol>): Promise<Group<A>> {
        validateTask(taskOptions.task);

        const { task, results } = group(taskOptions.task);

        await this
            .#loop({
                ...taskOptions,
                task
            });

        return Object.fromEntries(results[0]);
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
        let job: Function | undefined;
        const { interval } = this.#options;
        while (job = this.#queue.dequeue()) {
            job();

            const now = performance.now();
            if ((now - this.#currentStart) >= interval) {
                this.#currentStart = now;
            }

            const ms = (this.#currentStart + interval) - now;
            if (ms > 1)
                await new Promise<void>((resolve) => setTimeout(resolve, ms));
        }
    }

    override async run<A, B>(task: RunnableTask<A, B>, ...args: A[]): Promise<B> {
        const job = new Promise<B>((resolve, reject) => {
            const callback = () => this.#promise
                .then(() => task(...args))
                .then(resolve)
                .catch(reject);

            this.#queue.enqueue(callback);

            if (this.#currentRunning >= this.#options.maxConcurrency) return;

            this.#currentRunning++;
            this.#promise.then(() => this.#run().then(() => this.#currentRunning--));
        });
        return job;
    }

    override async[loop]<A, B>(input: Input<A>, task: Task<A, B>): Promise<void> {
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

    override set options(options: ThrottleCommonOptions) {
        validateOptions(options);
        this.#options = { ...this.#options, ...options };
    }

    override get options() {
        return { ...this.#options };
    }

}

Object.freeze(Throttle);

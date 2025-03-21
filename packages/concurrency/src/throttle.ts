import type { ThrottleCommonOptions, ThrottleTaskOptions, ThrottlePredicateOptions } from './base/options.js';
import { every, filter, find, forEach, group, interrupt, loop, map, mapSettled, some, validateAndProcessInput, validatePredicate, validateTask } from './base/shared.js';
import { SharedBase } from './base/shared-base.js';
import { Group, Input, RunnableTask, Task } from './base/types.js';
import { Semaphore, SemaphoreLock } from './semaphore.js';

function validateOptions(options: ThrottleCommonOptions) {
    if (!Number.isInteger(options.maxConcurrency)) {
        throw new Error('Parameter `maxConcurrency` must be a integer!');
    }

    if (!Number.isInteger(options.interval) || options.interval < 0) {
        throw new Error('Parameter `interval` must be a positive integer greater than 0!');
    }
}

export class Throttle extends SharedBase<ThrottleCommonOptions> {

    #options: ThrottleCommonOptions = undefined!;
    #semaphore: Semaphore = new Semaphore();
    #promise = Promise.resolve();
    #locks: SemaphoreLock[] = [];
    #currentStart: number = 0;
    #timer: NodeJS.Timeout | undefined;

    static async #loop<A, B>(taskOptions: ThrottleTaskOptions<A, B>) {
        validateOptions(taskOptions);
        const iterator = validateAndProcessInput(taskOptions.input);
        let done = false;

        const catchAndAbort = (err: unknown) => {
            done = true;
            throw err;
        };

        let currentStart = performance.now();
        const { interval, maxConcurrency, task } = taskOptions;

        await new Promise<void>((resolve, reject) => {
            let count = maxConcurrency;
            for (let i = 0; i < maxConcurrency; i++) {
                (async () => {
                    while (!done) {
                        const data = await iterator.next();
                        if (data.done || done)
                            break;

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
                    .then(() => (--count === 0) ? resolve() : undefined)
                    .catch(catchAndAbort)
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
        const { task } = forEach(taskOptions.task);

        await this.
            #loop({
                ...taskOptions,
                task
            });
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

    #clearLocks() {
        this.#locks.forEach(x => x.release());
        this.#locks = [];
        this.#timer = undefined;
    }

    override async run<A, B>(task: RunnableTask<A, B>, ...args: A[]): Promise<B> {
        const { interval } = this.#options;

        const lock = await this.#semaphore.acquire();
        this.#locks.push(lock);

        const now = performance.now();

        if ((now - this.#currentStart) >= interval)
            this.#currentStart = now;

        if (!this.#timer) {
            this.#timer = setTimeout(this.#clearLocks.bind(this), interval);
        }

        return this.#promise
            .then(() => task(...args));
    }

    override async[loop]<A, B>(input: Input<A>, task: Task<A, B>): Promise<void> {
        const iterator = validateAndProcessInput(input);

        let done = false;
        const { maxConcurrency } = this.#options;

        const catchAndAbort = (err: unknown) => {
            done = true;
            throw err;
        };

        await new Promise<void>((resolve, reject) => {
            let count = maxConcurrency;
            for (let i = 0; i < maxConcurrency; i++) {
                Promise
                    .resolve(iterator.next())
                    .then(async res => {
                        while (!done && !res.done) {
                            await this.run(task, await res.value);
                            res = await iterator.next();
                        }
                    })
                    .then(() => (--count === 0) ? resolve() : undefined)
                    .catch(catchAndAbort)
                    .catch(reject);
            }
        });
    }

    override set options(options: ThrottleCommonOptions) {
        validateOptions(options);
        this.#options = { ...this.#options, ...options };
        this.#semaphore.options = this.#options;
    }

    override get options() {
        return { ...this.#options };
    }

}

Object.freeze(Throttle);

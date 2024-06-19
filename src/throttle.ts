import type { ThrottleCommonOptions, ThrottleTaskOptions, ThrottlePredicateOptions } from './base/options';
import { every, filter, find, group, interrupt, loop, map, mapSettled, some } from './base/shared';
import { SharedBase, validateAndProcessInput, validatePredicate, validateTask } from './base/shared-base';
import { Input, RunnableTask, Task } from './base/types';
import { Semaphore, SemaphoreLock } from './semaphore';

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
    #semaphore: Semaphore = new Semaphore();
    #promise = Promise.resolve();
    #locks: SemaphoreLock[] = [];
    #currentStart: number = 0;
    #timer: NodeJS.Timeout | undefined;

    static async #loop<A, B>(taskOptions: ThrottleTaskOptions<A, B>) {
        // const t = new Throttle(taskOptions);
        // return t[loop](taskOptions.input, taskOptions.task);

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
     * @param {ThrottleTaskOptions<A, B>} taskOptions Task Options.
     * @returns {Promise<PromiseSettledResult<B>[]>}
     */
    static async mapSettled<A, B>(taskOptions: ThrottleTaskOptions<A, B>): Promise<PromiseSettledResult<B>[]> {
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
     * @param {ThrottlePredicateOptions<A>} taskOptions Task Options.
     * @returns {Promise<A[]>}
     */
    static async filter<A>(taskOptions: ThrottlePredicateOptions<A>): Promise<A[]> {
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
     * @param {ThrottlePredicateOptions<A>} taskOptions Task Options.
     * @returns {Promise<boolean>}
     */
    static async some<A>(taskOptions: ThrottlePredicateOptions<A>): Promise<boolean> {
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
     * @param {ThrottlePredicateOptions<A>} taskOptions Task Options.
     * @returns {Promise<A | undefined>}
     */
    static async find<A>(taskOptions: ThrottlePredicateOptions<A>): Promise<A | undefined> {
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
     * @param {ThrottlePredicateOptions<A>} taskOptions Task Options.
     * @returns {Promise<boolean>}
     */
    static async every<A>(taskOptions: ThrottlePredicateOptions<A>): Promise<boolean> {
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
     * @param {ThrottleTaskOptions<A, string | symbol>} taskOptions Task Options.
     * @returns {Promise<{ [key: string | symbol]: A[] }>}
     */
    static async group<A>(taskOptions: ThrottleTaskOptions<A, string | symbol>): Promise<{ [key: string | symbol]: A[] }> {
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

        await new Promise<void>((resolve, reject) => {
            for (let i = 0; i < maxConcurrency; i++) {
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

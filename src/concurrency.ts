import type { ConcurrencyCommonOptions, ConcurrencyPredicateOptions, ConcurrencyTaskOptions } from './options';
import { Queue } from './queue';
import { every, filter, find, group, interrupt, loop, map, mapSettled, some } from './shared';
import { SharedBase, validateAndProcessInput, validatePredicate, validateTask } from './shared-base';
import type { Input, Job, RunnableTask, Task } from './types';

export class Concurrency extends SharedBase<ConcurrencyCommonOptions> {

    #options: ConcurrencyCommonOptions;
    #currentRunning: number = 0;
    #queue: Queue<Job<any>> = new Queue();

    static async #loop<A, B>(taskOptions: ConcurrencyTaskOptions<A, B>){
        const iterator = validateAndProcessInput(taskOptions.input);

        const promises: Promise<void>[] = new Array(taskOptions.maxConcurrency);
        let done = false;

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
                    }
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
     * @param {ConcurrencyTaskOptions<A, B>} taskOptions Task Options.
     * @returns {Promise<PromiseSettledResult<B>[]>}
     */
    static async mapSettled<A, B>(taskOptions: ConcurrencyTaskOptions<A, B>): Promise<PromiseSettledResult<B>[]> {
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
     * @param {ConcurrencyPredicateOptions<A>} taskOptions Task Options.
     * @returns {Promise<A[]>}
     */
    static async filter<A>(taskOptions: ConcurrencyPredicateOptions<A>): Promise<A[]> {
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
     * @param {ConcurrencyPredicateOptions<A>} taskOptions Task Options.
     * @returns {Promise<boolean>}
     */
    static async some<A>(taskOptions: ConcurrencyPredicateOptions<A>): Promise<boolean> {
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
     * @param {ConcurrencyPredicateOptions<A>} taskOptions Task Options.
     * @returns {Promise<A | undefined>}
     */
    static async find<A>(taskOptions: ConcurrencyPredicateOptions<A>): Promise<A | undefined> {
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
     * @param {ConcurrencyPredicateOptions<A>} taskOptions Task Options.
     * @returns {Promise<boolean>}
     */
    static async every<A>(taskOptions: ConcurrencyPredicateOptions<A>): Promise<boolean> {
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
     * @param {ConcurrencyTaskOptions<A, string | symbol>} taskOptions Task Options.
     * @returns {Promise<{ [key: string | symbol]: A[] }>}
     */
    static async group<A>(taskOptions: ConcurrencyTaskOptions<A, string | symbol>): Promise<{ [key: string | symbol]: A[] }> {
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
     * @param {ConcurrencyCommonOptions} options 
     */
    constructor(options: ConcurrencyCommonOptions) {
        super();
        this.options = options;
    }

    async #run() {
        if (this.#currentRunning >= this.#options.maxConcurrency)
            return;

        while (this.#queue.length) {
            const job = this.#queue.shift()!;

            this.#currentRunning++;

            await Promise.resolve(job.task(...job.args))
                .then(job.resolve)
                .catch(job.reject);

            if (typeof this.#options.concurrencyInterval === 'number' && this.#options.concurrencyInterval > 0) {
                await new Promise<void>((resolve) => setTimeout(() => resolve(), this.#options.concurrencyInterval));
            }

            this.#currentRunning--;
        }
    }

    override run<A, B>(task: RunnableTask<A, B>, ...args: A[]): Promise<B> {
        const job = new Promise<B>((resolve, reject) => {
            this.#queue.push({ task, resolve, reject, args });
            this.#run();
        });
        return job;
    }

    override async [loop]<A>(input: Input<A>, task: Task<A, any>): Promise<void> {
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
                    })().catch(catchAndAbort);
                }
            }).catch(catchAndAbort);;
        }

        await Promise.all(promises);
    }

    override set options(options: ConcurrencyCommonOptions) {
        if (!Number.isInteger(options.maxConcurrency)) {
            throw new Error('Parameter `maxConcurrency` invalid!');
        }

        if (typeof options.concurrencyInterval === 'number') {
            if (isNaN(options.concurrencyInterval)) {
                throw new Error('Parameter `concurrencyInterval` invalid!');
            }

            if (options.concurrencyInterval < 0) {
                throw new Error('Parameter `concurrencyInterval` must be a positive number!');
            }
        } else {
            options.concurrencyInterval = void 0;
        }

        this.#options = { ...this.#options, ...options };
    }

    override get options() {
        return { ...this.#options };
    }

}

Object.freeze(Concurrency);

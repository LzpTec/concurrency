import type { ConcurrencyCommonOptions, ConcurrencyPredicateOptions, ConcurrencyTaskOptions } from './options';
import { Queue } from './queue';
import { SharedBase, interrupt, max, processTaskInput } from './shared-base';
import type { Input, Job, RunnableTask, Task } from './types';

export class Concurrency extends SharedBase<ConcurrencyCommonOptions> {

    #options: ConcurrencyCommonOptions;
    #currentRunning: number = 0;
    #queue: Queue<Job<any>> = new Queue();

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
        return new Concurrency(taskOptions).forEach(taskOptions.input, taskOptions.task);
    }

    /**
     * Performs the specified `task` function on each element in the `input`, and returns an array that contains the results.
     * 
     * It limits the concurrent execution to `maxConcurrency`.
     * 
     * @template A
     * @template B
     * @param {ConcurrencyTaskOptions<A, B>} taskOptions Task Options.
     * @returns {Promise<B[]>}
     */
    static async map<A, B>(taskOptions: ConcurrencyTaskOptions<A, B>): Promise<B[]> {
        return new Concurrency(taskOptions).map(taskOptions.input, taskOptions.task);
    }

    /**
     * Performs the specified `task` function on each element in the `input`, 
     * and creates a Promise that is resolved with an array of results when all of the tasks are resolve or reject.
     * 
     * It limits the concurrent execution to `maxConcurrency`.
     * 
     * @template A
     * @template B
     * @param {ConcurrencyTaskOptions<A, any>} taskOptions Task Options.
     * @returns {Promise<PromiseSettledResult<B>[]>}
     */
    static async mapSettled<A, B>(taskOptions: ConcurrencyTaskOptions<A, B>): Promise<PromiseSettledResult<B>[]> {
        return new Concurrency(taskOptions).mapSettled(taskOptions.input, taskOptions.task);
    }

    /**
     * Returns the elements that meet the condition specified in the `predicate` function.
     * 
     * It limits the concurrent execution to `maxConcurrency`.
     *
     * @template A
     * @param {ConcurrencyTaskOptions<A, any>} taskOptions Task Options.
     * @returns {Promise<A[]>}
     */
    static async filter<A>(taskOptions: ConcurrencyPredicateOptions<A>): Promise<A[]> {
        return new Concurrency(taskOptions).filter(taskOptions.input, taskOptions.predicate);
    }

    /**
     * Determines whether the specified `predicate` function returns true for any element of `input`.
     * 
     * It limits the concurrent execution to `maxConcurrency`.
     * 
     * @template A Input Type.
     * @param {BatchPredicateOptions<A>} taskOptions Task Options.
     * @returns {Promise<boolean>}
     */
    static async some<A>(taskOptions: ConcurrencyPredicateOptions<A>): Promise<boolean> {
        return new Concurrency(taskOptions).some(taskOptions.input, taskOptions.predicate);
    }

    /**
     * Returns the `input` value of the first `predicate` that resolves to true, and undefined otherwise.
     * 
     * It limits the concurrent execution to `maxConcurrency`.
     * 
     * @template A Input Type.
     * @param {BatchPredicateOptions<A>} taskOptions Task Options.
     * @returns {Promise<A | undefined>}
     */
    static async find<A>(taskOptions: ConcurrencyPredicateOptions<A>): Promise<A | undefined> {
        return new Concurrency(taskOptions).find(taskOptions.input, taskOptions.predicate);
    }

    /**
     * Determines whether all the elements of `input` satisfy the specified `predicate`.
     * 
     * It limits the concurrent execution to `maxConcurrency`.
     * 
     * @template A Input Type.
     * @param {BatchPredicateOptions<A>} taskOptions Task Options.
     * @returns {Promise<boolean>}
     */
    static async every<A>(taskOptions: ConcurrencyPredicateOptions<A>): Promise<boolean> {
        return new Concurrency(taskOptions).every(taskOptions.input, taskOptions.predicate);
    }

    /**
     * This method groups the elements of the `input` according to the string values returned by a provided `task`. 
     * 
     * The returned object has separate properties for each group, containing arrays with the elements in the group. 
     * 
     * It limits the concurrent execution to `maxConcurrency`.
     * 
     * @template A Input Type.
     * @param {ConcurrencyTaskOptions<A>} taskOptions Task Options.
     * @returns {Promise<{string | symbol}>}
     */
    static async group<A>(taskOptions: ConcurrencyTaskOptions<A, string | symbol>): Promise<{ [key: string | symbol]: A[] }> {
        return new Concurrency(taskOptions).group(taskOptions.input, taskOptions.task);
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

    override async run<A, B>(task: RunnableTask<A, B>, ...args: A[]): Promise<B> {
        const job = new Promise<B>((resolve, reject) => this.#queue.push({ task, resolve, reject, args }));
        if (!this.#isFull) {
            this.#run();
        }
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

    get #isFull(): boolean {
        return this.#currentRunning >= this.#options.maxConcurrency;
    }

    override get [max]() {
        return this.#options.maxConcurrency;
    }

}

Object.freeze(Concurrency);

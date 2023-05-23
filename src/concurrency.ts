import { Queue } from './collections';
import { Event } from './event-emitter';
import type { ConcurrencyCommonOptions, ConcurrencyPredicateOptions, ConcurrencyTaskOptions } from './options';
import { interrupt, SharedBase } from './shared-base';
import type { Input, Job, RunnableTask, Task } from './types';

export class Concurrency extends SharedBase<ConcurrencyCommonOptions> {

    /**
     * Performs the specified task for each element in the input, but it limits the concurrent execution to `maxConcurrency`.
     *
     * Same as Concurrency.map, But it doesn't store/return the results.
     * 
     * @template A
     * @param {ConcurrencyTaskOptions<A, any>} taskOptions Task Options.
     * @returns {Promise<void>}
     */
    static async forEach<A>(taskOptions: ConcurrencyTaskOptions<A, any>): Promise<void> {
        return new Concurrency(taskOptions).forEach(taskOptions.input, taskOptions.task);
    }

    /**
     * Same as Promise.all, but it limits the concurrent execution to `maxConcurrency`.
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
     * Same as Promise.allSettled, but it limits the concurrent execution to `maxConcurrency`.
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
     * Returns the elements that meet the condition specified in the predicate function, but it limits the concurrent execution to `maxConcurrency`.
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
     * @template A Input Type.
     * @param {BatchPredicateOptions<A>} taskOptions Task Options.
     * @returns {Promise<boolean>}
     */
    static async some<A>(taskOptions: ConcurrencyPredicateOptions<A>): Promise<boolean> {
        return new Concurrency(taskOptions).some(taskOptions.input, taskOptions.predicate);
    }

    /**
     * Returns the value of the first element of `input` where `predicate` is true, and undefined otherwise.
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
     * @template A Input Type.
     * @param {ConcurrencyTaskOptions<A>} taskOptions Task Options.
     * @returns {Promise<{string | symbol}>}
     */
    static async group<A>(taskOptions: ConcurrencyTaskOptions<A, string | symbol>): Promise<{ [key: string | symbol]: A[] }> {
        return new Concurrency(taskOptions).group(taskOptions.input, taskOptions.task);
    }

    #options: ConcurrencyCommonOptions;
    #currentRunning: number = 0;
    #queue: Queue<Job> = new Queue();
    #waitEvent: Event = new Event();

    /**
     * 
     * @param {ConcurrencyCommonOptions} options 
     */
    constructor(options: ConcurrencyCommonOptions) {
        super();
        this.options = options;
    }

    #runJob<T>(task: () => Promise<T> | T): Promise<T> {
        return new Promise((resolve, reject) => {
            this.#queue.enqueue({ task, resolve, reject });
            this.#run();
        });
    }

    async #run() {
        await Promise.resolve();

        if (this.#currentRunning >= this.#options.maxConcurrency)
            return;

        while (!this.#queue.isEmpty()) {
            const job = this.#queue.dequeue()!;

            this.#currentRunning++;

            await Promise.resolve(job.task())
                .then(res => { job.resolve(res); })
                .catch(err => { job.reject(err); });

            this.#currentRunning--;
            this.#waitEvent.emit();

            await new Promise<void>((resolve) => {
                if (typeof this.#options.concurrencyInterval === 'number' && this.#options.concurrencyInterval > 0)
                    return setTimeout(() => resolve(), this.#options.concurrencyInterval);

                return resolve();
            });
        }
    }

    override async forEach<A>(input: Input<A>, task: Task<A, any>): Promise<void> {
        const iterator = this.processTaskInput(input, task);

        let p = [];
        let done = false;

        while (!done) {
            p
                .push(
                    this.#runJob(async () => {
                        const res = await iterator.next();
                        if (res.done) {
                            done = true;
                            return;
                        }

                        const result = await task(await res.value);
                        if (result === interrupt) {
                            done = true;
                            iterator.return?.();
                            return;
                        }
                    })
                );

            await Promise.resolve();
            if (this.#currentRunning >= this.#options.maxConcurrency)
                await this.#waitEvent.once();
        }

        if (p.length > 0)
            await Promise.all(p);
    }

    override async mapSettled<A, B>(input: Input<A>, task: Task<A, B>): Promise<PromiseSettledResult<B>[]> {
        const iterator = this.processTaskInput(input, task);
        const results: PromiseSettledResult<B>[] = new Array();

        let idx = 0;
        let p = [];
        let done = false;

        while (!done) {
            const index = idx;
            idx++;

            p
                .push(
                    this.#runJob(async () => {
                        const res = await iterator.next();
                        if (res.done) {
                            done = true;
                            return;
                        }

                        results[index] = {
                            status: 'fulfilled',
                            value: await task(await res.value)
                        };
                    })
                        .catch(err =>
                            results[index] = {
                                status: 'rejected',
                                reason: err
                            }
                        )
                );

            await Promise.resolve();
            if (this.#currentRunning >= this.#options.maxConcurrency)
                await this.#waitEvent.once();
        }

        if (p.length > 0)
            await Promise.all(p);

        return results;
    }

    override async run<A, B>(task: RunnableTask<A, B>, ...args: A[]): Promise<B> {
        return await this.#runJob(() => Promise.resolve(task(...args)));
    }

    override set options(options: ConcurrencyCommonOptions) {
        if (typeof options.maxConcurrency !== 'number' || !Number.isInteger(options.maxConcurrency))
            throw new Error('Parameter `maxConcurrency` invalid!');

        if (typeof options.concurrencyInterval === 'number') {
            if (isNaN(options.concurrencyInterval))
                throw new Error('Parameter `concurrencyInterval` invalid!');

            if (options.concurrencyInterval < 0)
                throw new Error('Parameter `concurrencyInterval` must be a positive number!');
        } else {
            options.concurrencyInterval = void 0;
        }

        this.#options = Object.assign({}, this.#options, options);
    }

}

Object.freeze(Concurrency);

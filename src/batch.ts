import { Queue } from './collections';
import { Event } from './event-emitter';
import type { BatchCommonOptions, BatchPredicateOptions, BatchTaskOptions } from './options';
import { interrupt, processTaskInput, SharedBase } from './shared-base';
import type { Input, Job, RunnableTask, Task } from './types';

export class Batch extends SharedBase<BatchCommonOptions> {
    /**
     * Performs the specified task for each element in the input, but it waits for the first `batchSize` promises to finish before starting the next batch.
     *
     * Same as Batch.map, But it doesn't store/return the results.
     * 
     * @template A Input Type.
     * @param {BatchTaskOptions<A, any>} taskOptions Task Options.
     * @returns {Promise<void>}
     */
    static async forEach<A>(taskOptions: BatchTaskOptions<A, any>): Promise<void> {
        return new Batch(taskOptions).forEach(taskOptions.input, taskOptions.task);
    }

    /**
     * Same as Promise.all, but it waits for the first `batchSize` promises to finish before starting the next batch.
     *
     * @template A Input Type.
     * @template B Output Type.
     * @param {BatchTaskOptions<A, B>} taskOptions Task Options.
     * @returns {Promise<B[]>}
     */
    static async map<A, B>(taskOptions: BatchTaskOptions<A, B>): Promise<B[]> {
        return new Batch(taskOptions).map(taskOptions.input, taskOptions.task);
    }

    /**
     * Same as Promise.allSettled, but it waits for the first `batchSize` promises to finish before starting the next batch.
     *
     * @template A Input Type.
     * @template B Output Type.
     * @param {BatchTaskOptions<A, B>} taskOptions Task Options.
     * @returns {Promise<PromiseSettledResult<B>[]>}
     */
    static async mapSettled<A, B>(taskOptions: BatchTaskOptions<A, B>): Promise<PromiseSettledResult<B>[]> {
        return new Batch(taskOptions).mapSettled(taskOptions.input, taskOptions.task);
    }

    /**
     * Returns the elements that meet the condition specified in the predicate function, but it search in batches.
     *
     * @template A Input Type.
     * @param {BatchPredicateOptions<A>} taskOptions Task Options.
     * @returns {Promise<A[]>}
     */
    static async filter<A>(taskOptions: BatchPredicateOptions<A>): Promise<A[]> {
        return new Batch(taskOptions).filter(taskOptions.input, taskOptions.predicate);
    }

    /**
     * Determines whether the specified `predicate` function returns true for any element of `input`.
     * 
     * @template A Input Type.
     * @param {BatchPredicateOptions<A>} taskOptions Task Options.
     * @returns {Promise<boolean>}
     */
    static async some<A>(taskOptions: BatchPredicateOptions<A>): Promise<boolean> {
        return new Batch(taskOptions).some(taskOptions.input, taskOptions.predicate);
    }

    /**
     * Returns the value of the first element of `input` where `predicate` is true, and undefined otherwise.
     * 
     * @template A Input Type.
     * @param {BatchPredicateOptions<A>} taskOptions Task Options.
     * @returns {Promise<A | undefined>}
     */
    static async find<A>(taskOptions: BatchPredicateOptions<A>): Promise<A | undefined> {
        return new Batch(taskOptions).find(taskOptions.input, taskOptions.predicate);
    }

    /**
     * Determines whether all the elements of `input` satisfy the specified `predicate`.
     * 
     * @template A Input Type.
     * @param {BatchPredicateOptions<A>} taskOptions Task Options.
     * @returns {Promise<boolean>}
     */
    static async every<A>(taskOptions: BatchPredicateOptions<A>): Promise<boolean> {
        return new Batch(taskOptions).every(taskOptions.input, taskOptions.predicate);
    }

    /**
     * This method groups the elements of the `input` according to the string values returned by a provided `task`. 
     * 
     * The returned object has separate properties for each group, containing arrays with the elements in the group. 
     * 
     * @template A Input Type.
     * @param {BatchTaskOptions<A>} taskOptions Task Options.
     * @returns {Promise<{string | symbol}>}
     */
    static async group<A>(taskOptions: BatchTaskOptions<A, string | symbol>): Promise<{ [key: string | symbol]: A[] }> {
        return new Batch(taskOptions).group(taskOptions.input, taskOptions.task);
    }

    #options: BatchCommonOptions;
    #queue: Queue<Job> = new Queue();
    #waitEvent: Event = new Event();

    #jobs: Promise<any>[] = [];

    /**
     * 
     * @param {BatchCommonOptions} options 
     */
    constructor(options: BatchCommonOptions) {
        super();
        this.options = options;
        this.#queue.onItemAdded(() => {
            if (this.#jobs.length === 0) {
                this.#run();
            }
        });
    }

    #runJob<T>(task: () => Promise<T> | T): Promise<T> {
        return new Promise((resolve, reject) => this.#queue.enqueue({ task, resolve, reject }));
    }

    async #run() {
        while (!this.#queue.isEmpty()) {
            const job = this.#queue.dequeue()!;

            this.#jobs[this.#jobs.length] = Promise.resolve(job.task())
                .then(res => job.resolve(res))
                .catch(err => job.reject(err));

            if (this.#jobs.length >= this.#options.batchSize) {
                await Promise.all(this.#jobs);
                this.#jobs = [];

                if (typeof this.#options.batchInterval === 'number' && this.#options.batchInterval > 0) {
                    await new Promise<void>((resolve) => setTimeout(() => resolve(), this.#options.batchInterval));
                }

                this.#waitEvent.emit();
            }

            // Gives chance to add itens to the queue
            await Promise.resolve();
        }
    }

    override async forEach<A>(input: Input<A>, task: Task<A, any>): Promise<void> {
        const iterator = processTaskInput(input, task);

        const promises: Set<Promise<any>> = new Set();
        let done = false;

        const catchAndAbort = (err: any) => {
            done = true;
            throw err;
        };

        while (!done) {
            const jobPromise = this.#runJob(async () => {
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
            });

            const removeJob = () => promises.delete(jobPromise);
            promises.add(jobPromise.then(removeJob).catch(catchAndAbort));

            await Promise.resolve();

            if (this.#jobs.length >= this.#options.batchSize) {
                await this.#waitEvent.once();
            }
        }

        await Promise.all(promises);
    }

    override async mapSettled<A, B>(input: Input<A>, task: Task<A, B>): Promise<PromiseSettledResult<B>[]> {
        const iterator = processTaskInput(input, task);
        const results: PromiseSettledResult<B>[] = new Array();

        let idx = 0;
        let promises: Promise<any>[] = [];
        let done = false;

        while (!done) {
            const index = idx++;

            promises
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
            if (this.#jobs.length >= this.#options.batchSize) {
                await this.#waitEvent.once();
                promises = [];
            }
        }

        if (promises.length > 0) {
            await Promise.all(promises);
        }

        return results;
    }

    override async run<A, B>(task: RunnableTask<A, B>, ...args: A[]): Promise<B> {
        return await this.#runJob(() => Promise.resolve(task(...args)));
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

        this.#options = Object.assign({}, this.#options, options);
    }

}

Object.freeze(Batch);

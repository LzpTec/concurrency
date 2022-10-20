import { EventEmitter } from './event-emitter';

/**
 * @template A
 * @template B
 * @callback Task
 * @param {A} item
 * @returns {Promise.<B> | B}
 */
type Task<A, B> = (item: A) => Promise<B> | B;

export class Concurrency {
    /**
     * Same as Promise.all(items.map(item => task(item))), but it limits the concurrent execution to {maxConcurrency}
     *
     * @template A
     * @template B
     * @param {A[]} items Arguments to pass to the task for each call.
     * @param {number} maxConcurrency
     * @param {Task.<A, B>} task The task to run for each item.
     * @returns {Promise.<B[]>}
     */
    static async map<A, B>(items: A[], maxConcurrency: number, task: Task<A, B>): Promise<B[]> {
        const results = [];

        let error: any;

        const ev = new EventEmitter();
        let running = 0;

        for (const item of items) {
            if (error)
                throw error;

            results
                .push(
                    Promise.resolve(task(item))
                        .catch(err => {
                            error = err;
                            return;
                        })
                        .finally(() => {
                            running--;
                            ev.emit('free');
                        })
                );

            running++;

            while (running >= maxConcurrency)
                await new Promise((resolve) => ev.once('free', resolve));
        }

        return Promise
            .all(results)
            .then(res => {
                if (error)
                    throw error;

                const result: any = res;
                return result;
            })
            .finally(() => ev.removeAllListeners());
    }


    /**
     * Same as Promise.allSettled(items.map(item => task(item))), but it limits the concurrent execution to {maxConcurrency}
     *
     * @template A
     * @template B
     * @param {A[]} items Arguments to pass to the task for each call.
     * @param {number} maxConcurrency
     * @param {Task.<A, B>} task The task to run for each item.
     * @returns {Promise.<PromiseSettledResult.<B>[]>}
     */
    static async mapSettled<A, B>(items: A[], maxConcurrency: number, task: Task<A, B>): Promise<PromiseSettledResult<B>[]> {
        const results = [];

        const ev = new EventEmitter();
        let running = 0;

        for (const item of items) {
            results
                .push(
                    Promise.resolve(task(item))
                        .then(result => ({ error: null, result }))
                        .catch(error => ({ error, result: null }))
                        .finally(() => {
                            running--;
                            ev.emit('free');
                        })
                );

            running++;

            while (running >= maxConcurrency)
                await new Promise((resolve) => ev.once('free', resolve));
        }

        return await Promise
            .all(results)
            .then(res => {
                const response: Array<any> = res
                    .map(x => {
                        if (x.error)
                            return {
                                status: "rejected",
                                reason: x.error
                            }

                        return {
                            status: "fulfilled",
                            value: x.result
                        }
                    });

                return response;
            })
            .finally(() => ev.removeAllListeners());
    }

    /**
     * TODO DESC
     *
     * @template A
     * @param {A[]} items Arguments to pass to the task for each call.
     * @param {number} maxConcurrency
     * @param {Task.<A, void>} task The task to run for each item.
     * @returns {Promise.<void>}
     */
    static async forEach<A>(items: A[], maxConcurrency: number, task: Task<A, void>): Promise<void> {
        const results = [];
        let error: any;

        const ev = new EventEmitter();
        let running = 0;

        for (const item of items) {
            if (error)
                throw error;

            results
                .push(
                    Promise.resolve(task(item))
                        .catch(err => {
                            error = err;
                            return;
                        })
                        .finally(() => {
                            running--;
                            ev.emit('free');
                        })
                );

            running++;

            while (running >= maxConcurrency)
                await new Promise((resolve) => ev.once('free', resolve));
        }

        return Promise
            .all(results)
            .then(() => {
                if (error)
                    throw error;

                return;
            })
            .finally(() => ev.removeAllListeners());
    }

    #maxConcurrency: number;
    #eventEmitter: EventEmitter = new EventEmitter();
    #currentTaskId: number = Number.MIN_SAFE_INTEGER;
    #running: number = 0;
    #queue: { taskId: number; task: Function; }[] = [];
    #isProcessing: boolean = false;

    /**
     * 
     * @param {number} maxConcurrency 
     */
    constructor(maxConcurrency: number) {
        if (typeof maxConcurrency !== 'number' || isNaN(maxConcurrency))
            throw new Error('Parameter maxConcurrency invalid!');

        this.#maxConcurrency = maxConcurrency;

        this.#eventEmitter
            .on('newTask', async (item: any) => {
                this.#queue.push(item);
                if (!this.#isProcessing) {
                    this.#isProcessing = true;
                    this.#run();
                }
            });
    }

    async #run() {
        while (this.#queue.length > 0) {
            const item = this.#queue.splice(0, 1)[0];
            this.#running++;

            item
                .task()
                .then((res: any) => {
                    this.#eventEmitter.emit(`complete-${item.taskId}`, {
                        taskId: item.taskId,
                        result: res
                    });
                })
                .catch((err: any) => {
                    this.#eventEmitter.emit(`complete-${item.taskId}`, {
                        taskId: item.taskId,
                        error: err
                    });
                })
                .finally(() => {
                    this.#running--;
                    this.#eventEmitter.emit('free');
                });

            while (this.#running >= this.#maxConcurrency)
                await new Promise((resolve) => this.#eventEmitter.once('free', resolve));
        }
        this.#isProcessing = false;
    }

    /**
     * TODO DESC
     *
     * @template A
     * @template B
     * @param {A[]} items Arguments to pass to the task for each call.
     * @param {Task.<A, B>} task The task to run for each item.
     * @returns {Promise.<B[]>}
     */
    async map<A, B>(items: A[], task: Task<A, B>): Promise<B[]> {
        const results = [];
        let error: any;

        for (const item of items) {
            if (error)
                throw error;

            const taskId = this.#currentTaskId++;

            results
                .push(
                    new Promise((resolve, reject) => this.#eventEmitter.once(`complete-${taskId}`, (task: any) => {
                        if (task.error) reject(task.error);
                        else resolve(task.result);
                    }))
                        .catch(err => {
                            error = err;
                            return;
                        })
                );

            this.#eventEmitter
                .emit('newTask', {
                    taskId,
                    task: () => Promise.resolve(task(item))
                });
        }

        return Promise
            .all(results)
            .then(res => {
                if (error)
                    throw error;

                const result: any = res;
                return result;
            });
    }

    /**
     * TODO DESC
     *
     * @template A
     * @template B
     * @param {A[]} items Arguments to pass to the task for each call.
     * @param {Task.<A, B>} task The task to run for each item.
     * @returns {Promise.<PromiseSettledResult.<B>[]>}
     */
    async mapSettled<A, B>(items: A[], task: Task<A, B>): Promise<PromiseSettledResult<B>[]> {
        const results = [];

        for (const item of items) {
            const taskId = this.#currentTaskId++;

            results
                .push(
                    new Promise((resolve, reject) => this.#eventEmitter.once(`complete-${taskId}`, (task: any) => {
                        if (task.error) reject(task.error);
                        else resolve(task.result);
                    }))
                        .then(result => ({ error: null, result }))
                        .catch(error => ({ error, result: null }))
                );

            this.#eventEmitter
                .emit('newTask', {
                    taskId,
                    task: () => Promise.resolve(task(item))
                });
        }

        return await Promise
            .all(results)
            .then(res => {
                const response: any[] = res
                    .map(x => {
                        if (x.error)
                            return /** @type * */{
                                status: "rejected",
                                reason: x.error
                            }

                        return {
                            status: "fulfilled",
                            value: x.result
                        }
                    });

                return response;
            });
    }

    /**
     * TODO DESC
     *
     * @template A
     * @param {A[]} items Arguments to pass to the task for each call.
     * @param {Task.<A, void>} task The task to run for each item.
     * @returns {Promise.<void>}
     */
    async forEach<A>(items: A[], task: Task<A, void>): Promise<void> {
        const results = [];
        let error: any;

        for (const item of items) {
            if (error)
                throw error;

            const taskId = this.#currentTaskId++;


            results
                .push(
                    new Promise((resolve, reject) => this.#eventEmitter.on('complete', (task: any) => {
                        if (task.error) reject(task.error);
                        else resolve(task.result);
                    }))
                        .catch(err => {
                            error = err;
                            return;
                        })
                )

            this.#eventEmitter
                .emit('newTask', {
                    taskId,
                    task: () => Promise.resolve(task(item))
                });
        }

        return Promise
            .all(results)
            .then(() => {
                if (error)
                    throw error;

                return;
            });
    }

    get currentRunning() {
        return this.#running;
    }
}
Object.freeze(Concurrency);
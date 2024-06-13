import { Queue } from "./base/queue";
import { Job } from "./base/types";

type SemaphoreOptions = {
    maxConcurrency: number;
};

export class Semaphore {
    #currentQueue: Queue<Job<any>> = new Queue();
    #running = 0;
    #maxConcurrency = 1;
    #promise = Promise.resolve();

    constructor(options?: SemaphoreOptions) {
        this.#maxConcurrency = options?.maxConcurrency ?? 1;
    }

    run(task: Function, ...args: any) {
        return new Promise((resolve, reject) => {
            this.#currentQueue.enqueue({
                resolve,
                reject,
                task,
                args,
            });
            this.#tryNext();
        });
    }

    #tryNext() {
        if (!this.#currentQueue.length || this.#running >= this.#maxConcurrency)
            return;

        const { resolve, reject, task, args } = this.#currentQueue.dequeue()!;
        this.#running++;
        this.#promise
            .then(() => task(...args))
            .then((res) => resolve(res))
            .catch((err) => reject(err))
            .finally(() => {
                this.#running--;
                this.#tryNext();
            });
    }

    get options(): SemaphoreOptions {
        return {
            maxConcurrency: this.#maxConcurrency
        };
    }

    set options(options: SemaphoreOptions){
        this.#maxConcurrency = options.maxConcurrency;
    }

}
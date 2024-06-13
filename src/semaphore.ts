import { Queue } from "./base/queue";

type SemaphoreOptions = {
    maxConcurrency: number;
};

type SemaphoreLock = {
    release: () => void;
};

type SemaphoreItem = {
    task: Promise<void>;
    release: () => void;
};

export class Semaphore {
    #currentQueue: Queue<SemaphoreItem> = new Queue();
    #running = 0;
    #maxConcurrency = 1;
    #promise = Promise.resolve();

    constructor(options?: SemaphoreOptions) {
        this.#maxConcurrency = options?.maxConcurrency ?? 1;
    }

    async run<B>(task: () => (B | Promise<B>)): Promise<B>;
    async run<A extends Array<any>, B>(task: (...args: A) => (B | Promise<B>), ...args: A): Promise<B>;

    async run(task: Function, ...args: any[]) {
        const { release } = await this.acquire();
        try {
            return await task(args);
        } finally {
            release();
        }
    }

    async acquire(): Promise<SemaphoreLock> {
        let release: () => void;
        const task = new Promise<void>((res) => { release = res; });

        return new Promise<SemaphoreLock>((resolve) => {
            this.#currentQueue.enqueue({
                task,
                release: () => resolve({ release })
            });
            this.#tryNext();
        })
    }

    #tryNext() {
        if (!this.#currentQueue.length || this.#running >= this.#maxConcurrency)
            return;

        const { release, task } = this.#currentQueue.dequeue()!;
        this.#running++;
        this.#promise
            .then(release)
            .then(() => task)
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

    set options(options: SemaphoreOptions) {
        this.#maxConcurrency = options.maxConcurrency;
    }
}

import { Queue } from "./base/queue";

type SemaphoreOptions = {
    maxConcurrency: number;
};

type SemaphoreItem = {
    promise: Promise<void>;
    release: () => void;
};

export type SemaphoreLock = {
    release: () => void;
};

export class Semaphore {
    #currentQueue: Queue<SemaphoreItem> = new Queue();
    #acquired = 0;
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
        const promise = new Promise<void>((res) => { release = res; });

        return new Promise<SemaphoreLock>((resolve) => {
            this.#currentQueue.enqueue({
                promise,
                release: () => resolve({ release })
            });
            this.#tryNext();
        })
    }

    #tryNext() {
        if (!this.#currentQueue.length || this.#acquired >= this.#maxConcurrency)
            return;

        const { release, promise } = this.#currentQueue.dequeue()!;
        this.#acquired++;
        this.#promise
            .then(release)
            .then(() => promise)
            .finally(() => {
                this.#acquired--;
                this.#tryNext();
            });
    }

    get acquired(): number {
        return this.#acquired;
    }

    get options(): SemaphoreOptions {
        return { maxConcurrency: this.#maxConcurrency };
    }

    set options(options: SemaphoreOptions) {
        this.#maxConcurrency = options.maxConcurrency;
    }
}

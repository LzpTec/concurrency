import { Queue } from "./base/queue";

export class Lock {
    readonly #queue: Queue<Function> = new Queue();
    private acquired = false;

    public async acquire(): Promise<void> {
        if (!this.acquired) {
            this.acquired = true;
        } else {
            return new Promise<void>((resolve) => this.#queue.enqueue(resolve));
        }
    }

    public async release() {
        if (this.#queue.length === 0 && this.acquired) {
            this.acquired = false;
            return;
        }

        const continuation = this.#queue.dequeue()!;
        return new Promise<void>((resolve) => {
            continuation();
            resolve();
        });
    }
}
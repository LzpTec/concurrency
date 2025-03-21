import { Queue } from "./base/queue.js";

export class Lock {
    #queue: Queue<Function> = new Queue();
    #locked = false;

    async acquire(): Promise<void> {
        if (this.#locked) {
            return new Promise<void>((resolve) => this.#queue.enqueue(resolve));
        } else {
            this.#locked = true;
        }
    }

    async release() {
        if (this.#queue.length === 0 && this.#locked) {
            this.#locked = false;
            return;
        }

        const next = this.#queue.dequeue()!;
        return new Promise<void>((resolve) => {
            next();
            resolve();
        });
    }
}
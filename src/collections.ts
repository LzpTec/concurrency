import { Event } from "./event-emitter";

type Node<T> = {
    data: T;
    next?: Node<T>;
    prev?: Node<T>;
};

export class Queue<T> {
    #addEvent: Event = new Event();
    #head?: Node<T>;
    #tail?: Node<T>;

    public enqueue(item: T): void {
        const node: Node<T> = {
            data: item,
            next: undefined,
            prev: this.#tail,
        };

        if (this.isEmpty()) {
            this.#head = this.#tail = node;
        } else {
            if (this.#tail) {
                this.#tail.next = node;
            }
            this.#tail = node;
        }

        this.#addEvent.emit();
    }

    public dequeue(): T | undefined {
        if (!this.#head)
            return undefined;

        const deleted: T = this.#head.data;
        this.#head = this.#head.next;

        if (this.#head) {
            this.#head.prev = undefined;
        } else {
            this.#tail = undefined;
        }

        return deleted;
    }

    public isEmpty(): boolean {
        return !this.#head && !this.#tail;
    }

    public clear(): void {
        this.#head = undefined;
        this.#tail = undefined;
    }

    public onItemAdded(callback: (...args: any[]) => void): void {
        this.#addEvent.on(callback);
    }
}
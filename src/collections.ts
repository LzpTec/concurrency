import type { Node } from './types';

export class Queue<T> {
    private head: Node<T> | null = null;
    private tail: Node<T> | null = null;

    constructor(input?: T[]) {
        input?.forEach((element: T) => this.enqueue(element as T));
    }

    public enqueue(item: T): void {
        // if (item === null || item === undefined)
        //     throw new TypeError(`Missing type ${typeof item}`);

        const node: Node<T> = {
            data: item,
            next: null,
            prev: null,
        };

        if (this.isEmpty()) {
            this.head = this.tail = node;
            return;
        }

        if (this.tail) {
            this.tail.next = node;
            if (this.tail.next)
                this.tail.next.prev = this.tail;
        }

        this.tail = this.tail?.next ?? null;
    }

    public dequeue(): T | undefined {
        if (!this.head)
            return undefined;

        const deleted: T = this.head.data;
        this.head = this.head.next;
        if (this.head) {
            if (this.head.prev)
                this.head.prev.next = null;

            this.head.prev = null;
        } else {
            this.tail = null;
        }
        return deleted;
    }

    public isEmpty(): boolean {
        return !this.head && !this.tail;
    }

    public clear(): void {
        this.head = null;
        this.tail = null;
    }
}

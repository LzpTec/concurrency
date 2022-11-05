import type { Node } from './types';

export class LinkedList<T> {
    public head: Node<T> | null = null;
    public tail: Node<T> | null = null;
    #length: number = 0;

    clear() {
        this.head = null;
        this.tail = null;
        this.#length = 0;
    }

    insert(item: T) {
        const last = this.tail;
        const node: Node<T> = {
            data: item,
            next: null,
            prev: this.tail
        };

        if (last) {
            last.next = node;
            this.tail = last.next;
        } else {
            this.head = node;
            this.tail = this.head;
        }
        this.#length++;
    }

    remove(data: T) {
        let currentNode = this.head;
        while (currentNode) {
            if (data === currentNode.data) {
                if (currentNode.prev)
                    currentNode.prev.next = currentNode.next;

                if (currentNode.next)
                    currentNode.next.prev = currentNode.prev;

                return true;
            }

            currentNode = currentNode.next;
        }

        return false;
    }

    indexOf(data: T) {
        let nodeIndex = 0;
        let currentNode = this.head;
        while (currentNode) {
            if (data === currentNode.data)
                return nodeIndex;

            nodeIndex++;
            currentNode = currentNode.next;
        }

        return -1;
    }

    *[Symbol.iterator]() {
        let current = this.head;
        while (current) {
            yield current.data;
            current = current.next;
        }
    }

    get length() {
        return this.#length;
    }
}

export class Queue<T> {
    private head: Node<T> | null = null;
    private tail: Node<T> | null = null;
    private length: number = 0;

    constructor(input?: T[]) {
        input?.forEach((element: T) => this.enqueue(element as T));
    }

    public enqueue(item: T): void {
        if (item === null || item === undefined)
            throw new TypeError(`Missing type ${typeof item}`);

        const node: Node<T> = {
            data: item,
            next: null,
            prev: null,
        };

        if (this.isEmpty()) {
            this.head = this.tail = node;
            this.length++;
            return;
        }

        if (this.tail) {
            this.tail.next = node;
            if (this.tail.next)
                this.tail.next.prev = this.tail;
        }

        this.tail = this.tail?.next ?? null;
        this.length++;
    }

    public dequeue(): T | undefined {
        if (this.isEmpty() || !this.head)
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
        this.length--;
        return deleted;
    }

    public isEmpty(): boolean {
        return (!this.head && !this.tail);
    }

    public size(): number {
        return this.length;
    }

    public clear(): void {
        this.head = null;
        this.tail = null;
        this.length = 0;
    }
}

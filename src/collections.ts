type Node<T> = {
    data: T;
    next?: Node<T>;
    prev?: Node<T>;
};

export class Queue<T> {
    private head?: Node<T>;
    private tail?: Node<T>;

    public enqueue(item: T): void {
        const node: Node<T> = {
            data: item,
            next: void 0,
            prev: this.tail,
        };

        if (this.isEmpty()) {
            this.head = this.tail = node;
            return;
        }

        if (this.tail)
            this.tail.next = node;

        this.tail = this.tail?.next;
    }

    public dequeue(): T | undefined {
        if (!this.head)
            return void 0;

        const deleted: T = this.head.data;
        this.head = this.head.next;
        if (this.head) {
            if (this.head.prev)
                this.head.prev.next = void 0;

            this.head.prev = void 0;
        } else {
            this.tail = void 0;
        }
        return deleted;
    }

    public isEmpty(): boolean {
        return !this.head && !this.tail;
    }

    public clear(): void {
        this.head = void 0;
        this.tail = void 0;
    }
}

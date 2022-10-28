export class Node<T> {
    constructor(
        public data: T,
        public previous: Node<T> | null = null,
        public next: Node<T> | null = null
    ) { }
}

export class LinkedList<T> {
    public head: Node<T> | null = null;
    public tail: Node<T> | null = null;
    #length: number = 0;

    clear() {
        this.head = null;
        this.tail = null;
        this.#length = 0;
    }

    insert(data: T) {
        const last = this.tail;
        if (last) {
            last.next = new Node(data, this.tail);
            this.tail = last.next;
        } else {
            this.head = new Node(data);
            this.tail = this.head;
        }
        this.#length++;
    }

    remove(data: T) {
        let currentNode = this.head;
        while (currentNode) {
            if (data === currentNode.data) {
                if (currentNode.previous)
                    currentNode.previous.next = currentNode.next;

                if (currentNode.next)
                    currentNode.next.previous = currentNode.previous;

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

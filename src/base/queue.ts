export class Queue<T> {
    #elements: T[];
    #offset = 0;

    constructor(elements?: T[]) {
        this.#elements = Array.isArray(elements) ? elements : [];
    }

    enqueue(element: T) {
        this.#elements.push(element);
        return this;
    }

    dequeue() {
        if (this.length === 0)
            return undefined;

        const first = this.#elements[this.#offset];
        this.#offset += 1;

        if (this.#offset * 2 < this.#elements.length) return first;

        this.#elements = this.#elements.slice(this.#offset);
        this.#offset = 0;
        return first;
    }

    get length() {
        return this.#elements.length - this.#offset;
    }
}

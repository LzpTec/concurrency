export class Event {
    #events = new Set<(...args: any[]) => void>();

    on(callback: (...args: any[]) => void) {
        this.#events.add(callback);
    }

    once(): Promise<any[]>;
    once(callback?: (...args: any[]) => void): void;

    once(callback?: (...args: any[]) => void) {
        if (!callback)
            return new Promise<any[]>((resolve) => this.once(resolve));

        const ev = (...args: any[]) => {
            this.off(ev);
            callback(args);
        }
        this.#events.add(ev);
        return;
    }

    off(callback: (...args: any[]) => void) {
        this.#events.delete(callback);
    }

    emit(...args: any[]) {
        for (const ev of this.#events)
            ev(...args);
    }
}
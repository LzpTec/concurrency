import { LinkedList } from './linkedlist';

type Listener = (...args: any[]) => void;

export class EventEmitter {
    private events: Map<string | symbol | number, LinkedList<Listener>> = new Map();

    on(event: string | symbol | number, listener: Listener) {
        const listeners = this.events.get(event) ?? new LinkedList();
        listeners.insert(listener);
        this.events.set(event, listeners);
        return () => this.removeListener(event, listener);
    }

    removeListener(event: string | symbol | number, listener: Listener) {
        if (!this.events.has(event))
            return;

        this.events.get(event)!.remove(listener);

        if (this.events.get(event)?.length === 0)
            this.events.delete(event);
    }

    emit(event: string | symbol | number, ...args: any[]) {
        if (!this.events.has(event))
            return;

        const events = this.events.get(event)!;
        for (const listener of events)
            listener(args);
    }

    once(event: string | symbol | number, listener: Listener): void;
    once(event: string | symbol | number): Promise<any>;

    once(event: string | symbol | number, listener?: Listener): Promise<any> | void {
        if (typeof listener === 'function') {
            const remove = this.on(event, (...args) => {
                remove();
                listener(...args);
            });
            return;
        }

        return new Promise<any>((resolve) => {
            const remove = this
                .on(event, (...args) => {
                    remove();
                    resolve(args);
                });
        });
    }

    removeAllListeners(event?: string | symbol | number) {
        if (event) {
            this.events.delete(event);
            return;
        }

        this.events.clear();
    }
}

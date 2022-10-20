type Listener = (...args: any[]) => void;

export class EventEmitter {
    private events: { [key: string]: Listener[] } = {};

    on(event: string, listener: Listener) {
        this.events[event] = [listener].concat(this.events[event] || []);
        return () => this.removeListener(event, listener);
    }

    removeListener(event: string, listener: Listener) {
        if (!(event in this.events))
            return;

        const idx = this.events[event].indexOf(listener);
        if (idx > -1)
            this.events[event].splice(idx, 1);

        if (this.events[event].length === 0)
            delete this.events[event];
    }

    emit(event: string, ...args: any[]) {
        if (!(event in this.events))
            return;

        for (let i = this.events[event].length - 1; i >= 0; --i)
            this.events[event][i](args);
    }

    once(event: string, listener: Listener) {
        const remove = this.on(event, (...args) => {
            remove();
            listener(...args);
        });
    }

    removeAllListeners(event?: string) {
        if (event) {
            delete this.events[event];
            return;
        }

        this.events = {};
    }
}
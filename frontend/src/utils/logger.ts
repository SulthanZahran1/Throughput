// Remote logger - sends logs to backend for centralized viewing
// This allows debugging frontend issues by reading server terminal

const LOG_ENDPOINT = 'http://localhost:8080/api/log';

interface LogEntry {
    level: 'debug' | 'info' | 'warn' | 'error';
    source: string;
    message: string;
    data?: Record<string, unknown>;
    timestamp: string;
}

class RemoteLogger {
    private queue: LogEntry[] = [];
    private flushTimer: ReturnType<typeof setTimeout> | null = null;
    private enabled = true;

    constructor() {
        // Flush on page unload
        if (typeof window !== 'undefined') {
            window.addEventListener('beforeunload', () => this.flush());
        }
    }

    private scheduleFlush() {
        if (this.flushTimer) return;
        this.flushTimer = setTimeout(() => {
            this.flush();
            this.flushTimer = null;
        }, 100); // Batch logs every 100ms
    }

    private async flush() {
        if (this.queue.length === 0) return;

        const logs = this.queue.splice(0);
        try {
            await fetch(LOG_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ logs }),
            });
        } catch {
            // Backend not available, fall back to console only
        }
    }

    private log(level: LogEntry['level'], source: string, message: string, data?: Record<string, unknown>) {
        const entry: LogEntry = {
            level,
            source,
            message,
            data,
            timestamp: new Date().toISOString(),
        };

        // Also log to console
        const consoleMethod = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
        consoleMethod(`[${source}] ${message}`, data || '');

        if (this.enabled) {
            this.queue.push(entry);
            this.scheduleFlush();
        }
    }

    debug(source: string, message: string, data?: Record<string, unknown>) {
        this.log('debug', source, message, data);
    }

    info(source: string, message: string, data?: Record<string, unknown>) {
        this.log('info', source, message, data);
    }

    warn(source: string, message: string, data?: Record<string, unknown>) {
        this.log('warn', source, message, data);
    }

    error(source: string, message: string, data?: Record<string, unknown>) {
        this.log('error', source, message, data);
    }

    // FSM-specific helper
    fsm(event: string, data?: Record<string, unknown>) {
        this.debug('FSM', event, data);
    }

    setEnabled(enabled: boolean) {
        this.enabled = enabled;
    }
}

// Singleton instance
export const logger = new RemoteLogger();

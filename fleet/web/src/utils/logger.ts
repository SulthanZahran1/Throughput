export type LogLevel = 'debug' | 'info' | 'warn' | 'error'
export type LogCategory = 'vehicle' | 'order' | 'zone' | 'system'

interface LogEntry {
    session_id: string
    timestamp: number
    level: LogLevel
    category: LogCategory
    message: string
}

const SESSION_ID = Math.random().toString(36).substring(2, 15)
const LOGGER_URL = `http://${window.location.hostname}:3001/log`

export async function sendLog(level: LogLevel, category: LogCategory, message: string) {
    const entry: LogEntry = {
        session_id: SESSION_ID,
        timestamp: Date.now(),
        level,
        category,
        message,
    }

    try {
        await fetch(LOGGER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(entry),
        })
    } catch (err) {
        // Silent fail to avoid infinite loops if the logger itself fails
        console.error('Failed to send log to server:', err)
    }
}

export const logger = {
    debug: (category: LogCategory, message: string) => sendLog('debug', category, message),
    info: (category: LogCategory, message: string) => sendLog('info', category, message),
    warn: (category: LogCategory, message: string) => sendLog('warn', category, message),
    error: (category: LogCategory, message: string) => sendLog('error', category, message),
}

// Global error handler
window.onerror = (message, source, lineno, colno) => {
    logger.error('system', `Global error: ${message} at ${source}:${lineno}:${colno}`)
}

window.onunhandledrejection = (event) => {
    logger.error('system', `Unhandled promise rejection: ${event.reason}`)
}

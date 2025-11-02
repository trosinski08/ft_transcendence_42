function sendLog_frontend(level: string, message: string, metadata?: any)
{
    fetch('/log-frontend',
    { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            level,
            message,
            timestamp: new Date().toISOString(),
            ...metadata
        })
    }).catch(err => {
        console.error('Failed to send log to Logstash:', err, { level, message, metadata });
    });
}

export {sendLog_frontend};
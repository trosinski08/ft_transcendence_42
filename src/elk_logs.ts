function sendLog_frontend(level: string, message: string, metadata?: any)
{
    console.error('trying to send log to Logstash:');
  fetch('http://localhost:8080', 
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

    console.error('message sent log to Logstash:');
    console.error({ level, message, metadata });
}

export {sendLog_frontend};
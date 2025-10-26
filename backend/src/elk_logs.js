
async function sendLogToLogstash(level, message, metadata = {}) {
  try {
    const res = await fetch('http://localhost:8080', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level,
        message,
        timestamp: new Date().toISOString(),
        ...metadata
      })
    });
    if (!res.ok) {
      console.error('Logstash responded with error:', res.status, await res.text());
    }
  } catch (err) {
    console.error('Failed to send log to Logstash:', err, { level, message, metadata });
  }
}

module.exports = { sendLogToLogstash };
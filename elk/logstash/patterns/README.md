# Logstash Custom Patterns

This directory is for custom Grok patterns used by Logstash filters.

## Usage

Add custom patterns in the format:
```
PATTERN_NAME regex_pattern
```

Example:
```
GAME_EVENT \[%{TIMESTAMP_ISO8601:timestamp}\] %{WORD:event_type} - %{GREEDYDATA:message}
```

These patterns can then be referenced in `logstash.conf` grok filters.

## Resources
- [Grok Pattern Documentation](https://www.elastic.co/guide/en/logstash/current/plugins-filters-grok.html)
- [Built-in Grok Patterns](https://github.com/logstash-plugins/logstash-patterns-core/tree/main/patterns)

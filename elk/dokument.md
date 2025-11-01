# Instrukcja instalacji Grafana dla stosu ELK

1. **Dodaj usługę do docker-compose**  
   - Zdefiniuj serwis `grafana` z obrazem `grafana/grafana:latest`.  
   - Ustaw zależność na `elasticsearch` oraz `logstash`, aby kolejność startu była przewidywalna.  
   - Wystaw port `3000` na hosta (`3000:3000`).

2. **Skonfiguruj magazyn danych**  
   - Utwórz wolumen `grafana-storage` i podmontuj go jako `/var/lib/grafana`.  
   - Zapewnij uprawnienia zapisu dla użytkownika kontenera (`472`).

3. **Ustaw źródła danych**  
   - Po uruchomieniu zaloguj się do panelu (`admin`/`admin`).  
   - Dodaj datasource typu **Elasticsearch** wskazując na `http://elasticsearch:9200`.  
   - Skonfiguruj indeksy (np. `logstash-*`) oraz time field (`@timestamp`).

4. **Importuj dashboardy**  
   - Użyj oficjalnego starter dashboardu dla ELK (ID 12900) lub przygotuj własny JSON.  
   - Dodaj panele dla liczby logów, poziomów logowania i czasu odpowiedzi backendu.

5. **Bezpieczeństwo i NSSM**  
   - Zmień hasło admina podczas pierwszego logowania.  
   - Jeśli Grafana ma być dostępna publicznie, skonfiguruj reverse proxy (Nginx) oraz TLS.  
   - Włącz backupy wolumenu `grafana-storage` (np. `rsync` lub snapshoty).  

6. **Integracja alertów**  
   - Skonfiguruj kontakt (Slack, e-mail).  
   - Dodaj reguły alertowe dla wysokiego błędu 5xx i wzrostu opóźnień.  
   - W przypadku środowisk produkcyjnych wykorzystaj Grafana Alerting (Unified Alerting).

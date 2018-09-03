# Netgear JGS524PE Managed Switch to InfluxDB bridge

Quick and dirty script, currently just polls the per-port transfer stats and posts those to influxdb in the proper format.

This is a cheap managed switch without SNMP support, but with a web interface that gives you useful information over HTTP in a format that's relatively easy to parse.

Somewhat inspired by [hs110-exporter](https://github.com/cgarnier/hs110-exporter) and my [fork](https://github.com/scanlime/hs110-exporter).

```bash
git clone https://github.com/scanlime/netgear-jgs524pe-influx.git
npm install
```

```bash
INTERVAL=5000 \
SWITCH_HOST=192.168.1.4 \
SWITCH_PASSWORD=switch-admin-password \
INFLUX_HOST=localhost \
INFLUX_DB=metrics-db \
INFLUX_USERNAME=metrics-user \
INFLUX_PASSWORD=correct-horse-battery-staple \
npm start
```

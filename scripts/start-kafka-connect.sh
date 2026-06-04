#!/bin/bash
set -euo pipefail

# Wait for Kafka broker to be ready
until /srv/kafka/bin/kafka-broker-api-versions.sh \
        --bootstrap-server localhost:9092 > /dev/null 2>&1; do
  sleep 2
done

export CLASSPATH="/srv/kafka/plugins/sinetstream/*"

exec /srv/kafka/bin/connect-distributed.sh \
  /srv/kafka/config/connect-distributed.properties

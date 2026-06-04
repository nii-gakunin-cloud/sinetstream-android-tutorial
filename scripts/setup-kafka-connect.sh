#!/bin/bash
set -euo pipefail

TOPIC="${KAFKA_CONNECT_TOPIC:-sensor-data}"
BUCKET="${SEAWEEDFS_BUCKET:-sensor-data}"
CONNECTOR_URL=http://localhost:8083/connectors
RETRY=10

register_mqtt_source() {
  local name="mqtt-source-${TOPIC}"
  curl -f -s "${CONNECTOR_URL}/${name}" > /dev/null 2>&1 && return 0
  curl -f -X POST "${CONNECTOR_URL}" \
    -H "Content-Type: application/json" -d @- <<EOS
{
  "name": "${name}",
  "config": {
    "connector.class": "io.lenses.streamreactor.connect.mqtt.source.MqttSourceConnector",
    "tasks.max": "1",
    "connect.mqtt.hosts": "tcp://localhost:1883",
    "connect.mqtt.service.quality": "1",
    "connect.mqtt.kcql": "INSERT INTO \`${TOPIC}\` SELECT * FROM \`${TOPIC}\`",
    "value.converter": "org.apache.kafka.connect.converters.ByteArrayConverter"
  }
}
EOS
}

register_s3_sink() {
  local name="s3-sink-${TOPIC}"
  curl -f -s "${CONNECTOR_URL}/${name}" > /dev/null 2>&1 && return 0
  curl -f -X POST "${CONNECTOR_URL}" \
    -H "Content-Type: application/json" -d @- <<EOS
{
  "name": "${name}",
  "config": {
    "connector.class": "io.confluent.connect.s3.S3SinkConnector",
    "tasks.max": "1",
    "topics": "${TOPIC}",
    "s3.bucket.name": "${BUCKET}",
    "store.url": "http://localhost:8333",
    "storage.class": "io.confluent.connect.s3.storage.S3Storage",
    "format.class": "io.confluent.connect.s3.format.json.JsonFormat",
    "flush.size": "1",
    "partitioner.class": "io.confluent.connect.storage.partitioner.TimeBasedPartitioner",
    "path.format": "'year'=YYYY/'month'=MM/'day'=dd/'hour'=HH",
    "partition.duration.ms": "3600000",
    "timestamp.extractor": "Record",
    "timezone": "UTC",
    "locale": "en-US",
    "key.converter": "org.apache.kafka.connect.converters.ByteArrayConverter",
    "value.converter": "jp.ad.sinet.sinetstream.connect.converters.SinetStreamConverter",
    "value.converter.schemas.enable": "false",
    "transforms": "castMsg,parseJson,extractMsg",
    "transforms.castMsg.type": "jp.ad.sinet.sinetstream.connect.transforms.StringCast\$Value",
    "transforms.castMsg.field": "msg",
    "transforms.parseJson.type": "jp.ad.sinet.sinetstream.connect.transforms.ParseJson\$Value",
    "transforms.parseJson.field": "msg",
    "transforms.extractMsg.type": "org.apache.kafka.connect.transforms.ExtractField\$Value",
    "transforms.extractMsg.field": "msg",
    "schema.compatibility": "NONE",
    "aws.access.key.id": "minioadmin",
    "aws.secret.access.key": "minioadmin"
  }
}
EOS
}

# Wait for Kafka Connect REST API to be ready
until curl -sf http://localhost:8083/ > /dev/null 2>&1; do
  sleep 2
done

for register in register_mqtt_source register_s3_sink; do
  for ((i = 0; i < RETRY; i++)); do
    if ${register}; then
      break
    fi
    sleep 1
  done
  if ((i >= RETRY)); then
    echo "Failed to register connector: ${register}" >&2
    exit 1
  fi
done

# syntax=docker/dockerfile:1
FROM --platform=$BUILDPLATFORM eclipse-temurin:21-jdk AS build-java

COPY components/converter /build/converter

WORKDIR /build/converter
RUN ./gradlew jar copyDeps

FROM --platform=$BUILDPLATFORM node:24-slim AS build-chart

WORKDIR /app
COPY components/chart/package.json components/chart/package-lock.json ./
RUN npm ci
COPY components/chart/ ./
RUN npm run build

FROM harbor.vcloud.nii.ac.jp/sinetstream/tutorial:1
SHELL ["/bin/bash", "-o", "pipefail", "-c"]

RUN dnf -y install \
    unzip \
    nginx \
  && dnf clean all \
  && mkdir -p /var/www/html

ARG S3_SINK_VERSION=12.1.2
ARG MQTT_CONNECT_VERSION=11.6.2
RUN mkdir -p /srv/kafka/plugins \
  && curl -L "https://hub-downloads.confluent.io/api/plugins/confluentinc/kafka-connect-s3/versions/${S3_SINK_VERSION}/confluentinc-kafka-connect-s3-${S3_SINK_VERSION}.zip" \
     -o /tmp/s3-sink.zip \
  && unzip /tmp/s3-sink.zip -d /srv/kafka/plugins \
  && rm /tmp/s3-sink.zip \
  && curl -L "https://github.com/lensesio/stream-reactor/releases/download/${MQTT_CONNECT_VERSION}/kafka-connect-mqtt-${MQTT_CONNECT_VERSION}.zip" \
        -o /tmp/mqtt-connect.zip \
  && unzip /tmp/mqtt-connect.zip -d /srv/kafka/plugins \
  && rm /tmp/mqtt-connect.zip

RUN echo -e '\nplugin.path=/srv/kafka/plugins\nlisteners=HTTP://:8083' \
      >> /srv/kafka/config/connect-distributed.properties

COPY --from=build-java /build/converter/build/libs/*.jar /srv/kafka/plugins/sinetstream/
COPY --from=build-java /build/converter/build/deps/ /srv/kafka/plugins/sinetstream/
COPY --from=build-chart /app/dist/ /var/www/html/

# Install SeaweedFS
ARG SEAWEEDFS_VERSION=4.17
ARG TARGETARCH
RUN curl -L "https://github.com/seaweedfs/seaweedfs/releases/download/${SEAWEEDFS_VERSION}/linux_${TARGETARCH}.tar.gz" \
      -o /tmp/seaweedfs.tar.gz \
  && tar xzf /tmp/seaweedfs.tar.gz -C /usr/bin weed \
  && rm /tmp/seaweedfs.tar.gz \
  && mkdir -p /var/lib/seaweedfs

COPY scripts/start-kafka-connect.sh /usr/local/bin/start-kafka-connect.sh
COPY scripts/setup-seaweedfs.sh /usr/local/bin/setup-seaweedfs.sh
COPY scripts/setup-kafka-connect.sh /usr/local/bin/setup-kafka-connect.sh
RUN chmod +x /usr/local/bin/start-kafka-connect.sh /usr/local/bin/setup-seaweedfs.sh /usr/local/bin/setup-kafka-connect.sh
COPY etc /etc

# License files — base image files are moved to a subdirectory to avoid overwriting
RUN mv /opt/licenses /opt/licenses-base \
 && mkdir -p /opt/licenses/sinetstream-tutorial /opt/licenses/android-sensor-dashboard \
 && mv /opt/licenses-base/* /opt/licenses/sinetstream-tutorial/ \
 && rm -r /opt/licenses-base
COPY LICENSE NOTICE /opt/licenses/android-sensor-dashboard/

ENV SEAWEEDFS_BUCKET=sensor-data \
    KAFKA_CONNECT_TOPIC=sensor-data
EXPOSE 1883 80

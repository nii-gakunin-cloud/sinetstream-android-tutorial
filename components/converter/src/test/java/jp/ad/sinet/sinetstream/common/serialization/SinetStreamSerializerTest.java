// SPDX-FileCopyrightText: 2026-present National Institute of Informatics <sinetstream-support@nii.ac.jp>
// SPDX-License-Identifier: Apache-2.0

package jp.ad.sinet.sinetstream.common.serialization;

import org.apache.avro.Schema;
import org.apache.avro.generic.GenericData;
import org.apache.kafka.common.config.ConfigException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.Collections;

import static org.junit.jupiter.api.Assertions.*;

class SinetStreamSerializerTest {

    private Schema schema;

    @BeforeEach
    void setUp() throws IOException {
        schema = new Schema.Parser().parse(
                SinetStreamSerde.class.getResourceAsStream("/messageSchema.avsc"));
    }

    @Test
    void serializeV2() {
        GenericData.Record data = new GenericData.Record(schema);
        data.put("tstamp", TestData.TIMESTAMP);
        data.put("msg", ByteBuffer.wrap(TestData.MESSAGE.getBytes(StandardCharsets.UTF_8)));

        SinetStreamSerializer serializer = new SinetStreamSerializer(schema);
        serializer.configure(Collections.singletonMap(SinetStreamSerde.MESSAGE_FORMAT_CONFIG, 2), false);
        byte[] ret = serializer.serialize(TestData.TOPIC, data);
        assertArrayEquals(TestData.V2_BYTE_DATA, ret);
    }

    @Test
    void serializeV3() {
        GenericData.Record data = new GenericData.Record(schema);
        data.put("tstamp", TestData.TIMESTAMP);
        data.put("msg", ByteBuffer.wrap(TestData.MESSAGE.getBytes(StandardCharsets.UTF_8)));

        SinetStreamSerializer serializer = new SinetStreamSerializer(schema);
        serializer.configure(Collections.emptyMap(), false);
        byte[] ret = serializer.serialize(TestData.TOPIC, data);
        assertArrayEquals(TestData.V3_BYTE_DATA, ret);
    }

    @Test
    void nullData() {
        SinetStreamSerializer serializer = new SinetStreamSerializer(schema);
        serializer.configure(Collections.emptyMap(), false);
        byte[] ret = serializer.serialize(TestData.TOPIC, null);
        assertNull(ret);
    }

    @Test
    void badData() {
        GenericData.Record data = new GenericData.Record(schema);
        data.put("tstamp", TestData.TIMESTAMP);
        data.put("msg", TestData.MESSAGE);

        SinetStreamSerializer serializer = new SinetStreamSerializer(schema);
        serializer.configure(Collections.emptyMap(), false);
        assertThrows(ClassCastException.class, () -> serializer.serialize(TestData.TOPIC, data));
    }

    @Test
    void badConfig() {
        SinetStreamSerializer serializer = new SinetStreamSerializer(schema);
        serializer.configure(Collections.emptyMap(), false);
        assertThrows(ConfigException.class,
                () -> serializer.configure(Collections.singletonMap(SinetStreamSerde.MESSAGE_FORMAT_CONFIG, 1), false));
    }
}

// SPDX-FileCopyrightText: 2026-present National Institute of Informatics <sinetstream-support@nii.ac.jp>
// SPDX-License-Identifier: Apache-2.0

package jp.ad.sinet.sinetstream.common.serialization;

import org.apache.avro.AvroRuntimeException;
import org.apache.avro.Schema;
import org.apache.avro.generic.GenericRecord;
import org.apache.avro.message.BadHeaderException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.Collections;

import static org.junit.jupiter.api.Assertions.*;

class SinetStreamDeserializerTest {

    private Schema schema;

    @BeforeEach
    void setUp() throws IOException {
        schema = new Schema.Parser().parse(
                SinetStreamSerde.class.getResourceAsStream("/messageSchema.avsc"));
    }

    @Test
    void v2deserialize() {
        SinetStreamDeserializer deserializer = new SinetStreamDeserializer(schema);
        deserializer.configure(Collections.singletonMap(SinetStreamSerde.MESSAGE_FORMAT_CONFIG, 2), false);
        GenericRecord ret = deserializer.deserialize(TestData.TOPIC, TestData.V2_BYTE_DATA);
        assertEquals(TestData.TIMESTAMP, ret.get("tstamp"));
        assertEquals(TestData.MESSAGE, new String(((ByteBuffer) ret.get("msg")).array(), StandardCharsets.UTF_8));
    }

    @Test
    void v3deserialize() {
        SinetStreamDeserializer deserializer = new SinetStreamDeserializer(schema);
        deserializer.configure(Collections.emptyMap(), false);
        GenericRecord ret = deserializer.deserialize(TestData.TOPIC, TestData.V3_BYTE_DATA);
        assertEquals(TestData.TIMESTAMP, ret.get("tstamp"));
        assertEquals(TestData.MESSAGE, new String(((ByteBuffer) ret.get("msg")).array(), StandardCharsets.UTF_8));
    }

    @Test
    void nullData() {
        SinetStreamDeserializer deserializer = new SinetStreamDeserializer(schema);
        deserializer.configure(Collections.emptyMap(), false);
        GenericRecord ret = deserializer.deserialize(TestData.TOPIC, null);
        assertNull(ret);
    }

    @Nested
    class BadData {
        @Test
        void badHeader() {
            byte[] data = new byte[TestData.V2_BYTE_DATA.length];
            System.arraycopy(TestData.V2_BYTE_DATA, 0, data, 0, data.length);
            data[0] = 0;

            SinetStreamDeserializer deserializer = new SinetStreamDeserializer(schema);
            deserializer.configure(Collections.singletonMap(SinetStreamSerde.MESSAGE_FORMAT_CONFIG, 2), false);
            assertThrows(BadHeaderException.class, () -> deserializer.deserialize(TestData.TOPIC, data));
        }

        @Test
        void badHeaderV3() {
            byte[] data = new byte[TestData.V3_BYTE_DATA.length];
            System.arraycopy(TestData.V3_BYTE_DATA, 0, data, 0, data.length);
            data[1] = 2;

            SinetStreamDeserializer deserializer = new SinetStreamDeserializer(schema);
            deserializer.configure(Collections.emptyMap(), false);
            assertThrows(BadHeaderException.class, () -> deserializer.deserialize(TestData.TOPIC, data));
        }

        @Test
        void badLength() {
            byte[] data = new byte[TestData.V2_BYTE_DATA.length - 1];
            System.arraycopy(TestData.V2_BYTE_DATA, 0, data, 0, data.length);

            SinetStreamDeserializer deserializer = new SinetStreamDeserializer(schema);
            deserializer.configure(Collections.emptyMap(), false);
            assertThrows(AvroRuntimeException.class, () -> deserializer.deserialize(TestData.TOPIC, data));
        }

        @Test
        void tooShort() {
            byte[] data = { (byte) 0xdf, (byte) 0x3, (byte) 0x0, (byte) 0x0, };
            SinetStreamDeserializer deserializer = new SinetStreamDeserializer(schema);
            deserializer.configure(Collections.emptyMap(), false);
            assertThrows(BadHeaderException.class, () -> deserializer.deserialize(TestData.TOPIC, data));
        }

        @Test
        void tooShort2() {
            byte[] data = new byte[TestData.V3_HEADER.length];
            System.arraycopy(TestData.V3_HEADER, 0, data, 0, data.length);
            SinetStreamDeserializer deserializer = new SinetStreamDeserializer(schema);
            deserializer.configure(Collections.emptyMap(), false);
            assertThrows(BadHeaderException.class, () -> deserializer.deserialize(TestData.TOPIC, data));
        }
    }
}

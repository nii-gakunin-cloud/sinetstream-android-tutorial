// SPDX-FileCopyrightText: 2026-present National Institute of Informatics <sinetstream-support@nii.ac.jp>
// SPDX-License-Identifier: Apache-2.0

package jp.ad.sinet.sinetstream.common.serialization;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class SinetStreamSerdeTest {

    @Test
    void getSchema() {
        SinetStreamSerde serde = new SinetStreamSerde();
        assertNotNull(serde.getSchema());
    }

    @Test
    void serializer() {
        SinetStreamSerde serde = new SinetStreamSerde();
        assertNotNull(serde.serializer());
    }

    @Test
    void deserializer() {
        SinetStreamSerde serde = new SinetStreamSerde();
        assertNotNull(serde.deserializer());
    }
}
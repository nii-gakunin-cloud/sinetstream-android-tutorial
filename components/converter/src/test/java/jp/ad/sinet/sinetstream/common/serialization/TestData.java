// SPDX-FileCopyrightText: 2026-present National Institute of Informatics <sinetstream-support@nii.ac.jp>
// SPDX-License-Identifier: Apache-2.0

package jp.ad.sinet.sinetstream.common.serialization;

import java.time.LocalDateTime;
import java.time.Month;
import java.time.ZoneOffset;

final class TestData {

    static final String TOPIC = "topic-0";
    static final String MESSAGE = "message 0";
    static final long TIMESTAMP = LocalDateTime.of(2020, Month.JANUARY, 1, 0, 0, 0)
            .toInstant(ZoneOffset.ofHours(9)).toEpochMilli() * 1000;
    static final byte[] V2_BYTE_DATA = {
            (byte) 0xc3, (byte) 0x01, (byte) 0x1f, (byte) 0x9c, (byte) 0x0c, (byte) 0x91, (byte) 0xeb, (byte) 0x33,
            (byte) 0x66, (byte) 0x4f, (byte) 0x80, (byte) 0xf0, (byte) 0xcb, (byte) 0xec, (byte) 0xa6, (byte) 0xc0,
            (byte) 0xcd, (byte) 0x05, (byte) 0x12, (byte) 0x6d, (byte) 0x65, (byte) 0x73, (byte) 0x73, (byte) 0x61,
            (byte) 0x67, (byte) 0x65, (byte) 0x20, (byte) 0x30,
    };
    static final byte[] V3_HEADER = {
            (byte) 0xdf, (byte) 0x3, (byte) 0x0, (byte) 0x0, (byte) 0, (byte) 0,
    };
    static final byte[] V3_BYTE_DATA;

    static {
        V3_BYTE_DATA = new byte[V3_HEADER.length + V2_BYTE_DATA.length];
        System.arraycopy(V3_HEADER, 0, V3_BYTE_DATA, 0, V3_HEADER.length);
        System.arraycopy(V2_BYTE_DATA, 0, V3_BYTE_DATA, V3_HEADER.length, V2_BYTE_DATA.length);
    }

    private TestData() {
    }
}

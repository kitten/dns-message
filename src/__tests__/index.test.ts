import { describe, it, expect } from 'vitest';

import * as utils from './utils';

import {
  decode,
  streamDecode,
  encode,
  streamEncode,
  encodingLength,
  Packet,
  PacketType,
  PacketFlag,
  RecordType,
  RecordClass,
} from '../index';

describe('decode', () => {
  it('decodes from Uint8Array', () => {
    const bytes = utils.hex('123401000000000000000000');
    const result = decode(bytes);
    expect(result.id).toBe(0x1234);
    expect(result.type).toBe(PacketType.QUERY);
    expect(result.flags).toBe(PacketFlag.RECURSION_DESIRED);
  });

  it('decodes from ArrayBuffer', () => {
    const bytes = utils.hex('123401000000000000000000');
    const buffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(buffer).set(bytes);
    const result = decode(buffer);
    expect(result.id).toBe(0x1234);
    expect(result.type).toBe(PacketType.QUERY);
    expect(result.flags).toBe(PacketFlag.RECURSION_DESIRED);
  });

  it('decodes from DataView', () => {
    const bytes = utils.hex('123401000000000000000000');
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const result = decode(view);
    expect(result.id).toBe(0x1234);
    expect(result.type).toBe(PacketType.QUERY);
    expect(result.flags).toBe(PacketFlag.RECURSION_DESIRED);
  });

  it('decodes packet with question', () => {
    const bytes = utils.hex('123401000001000000000000047465737400000100ff');
    const result = decode(bytes);
    expect(result.id).toBe(0x1234);
    expect(result.questions).toHaveLength(1);
    expect(result.questions![0].name).toBe('test');
    expect(result.questions![0].type).toBe(RecordType.A);
    expect(result.questions![0].class).toBe(RecordClass.ANY);
  });

  it('decodes packet with answer', () => {
    const bytes = utils.hex(
      '1234010000000001000000000474657374000001000100000064000401010101'
    );
    const result = decode(bytes);
    expect(result.answers).toHaveLength(1);
    expect(result.answers![0].name).toBe('test');
    expect(result.answers![0].type).toBe(RecordType.A);
    expect(result.answers![0].data).toBe('1.1.1.1');
  });

  it('handles Uint8Array with byteOffset', () => {
    // Create a buffer with some prefix data
    const fullBuffer = utils.hex('deadbeef123401000000000000000000');
    const sliced = new Uint8Array(
      fullBuffer.buffer,
      fullBuffer.byteOffset + 4,
      12
    );
    const result = decode(sliced);
    expect(result.id).toBe(0x1234);
    expect(result.type).toBe(PacketType.QUERY);
  });
});

describe('streamDecode', () => {
  it('decodes stream-formatted packet (with 2-byte length prefix)', () => {
    const bytes = utils.hex('000c123401000000000000000000');
    const result = streamDecode(bytes);
    expect(result.id).toBe(0x1234);
    expect(result.type).toBe(PacketType.QUERY);
    expect(result.flags).toBe(PacketFlag.RECURSION_DESIRED);
  });

  it('decodes from ArrayBuffer', () => {
    const bytes = utils.hex('000c123401000000000000000000');
    const buffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(buffer).set(bytes);
    const result = streamDecode(buffer);
    expect(result.id).toBe(0x1234);
  });

  it('decodes stream packet with question', () => {
    const bytes = utils.hex('0015123401000001000000000000047465737400000100ff');
    const result = streamDecode(bytes);
    expect(result.id).toBe(0x1234);
    expect(result.questions).toHaveLength(1);
    expect(result.questions![0].name).toBe('test');
  });
});

describe('encode', () => {
  it('encodes empty packet', () => {
    const packet: Packet = {
      id: 0x1234,
      type: PacketType.QUERY,
      flags: PacketFlag.RECURSION_DESIRED,
    };
    const result = encode(packet);
    expect(utils.toHex(result)).toBe('123401000000000000000000');
  });

  it('encodes packet with question', () => {
    const packet: Packet = {
      id: 0x1234,
      type: PacketType.QUERY,
      flags: PacketFlag.RECURSION_DESIRED,
      questions: [
        {
          name: 'test',
          type: RecordType.A,
          class: RecordClass.ANY,
        },
      ],
    };
    const result = encode(packet);
    expect(utils.toHex(result)).toBe(
      '123401000001000000000000047465737400000100ff'
    );
  });

  it('encodes packet with answer', () => {
    const packet: Packet = {
      id: 0x1234,
      type: PacketType.QUERY,
      flags: PacketFlag.RECURSION_DESIRED,
      answers: [
        {
          type: RecordType.A,
          name: 'test',
          class: RecordClass.IN,
          data: '1.1.1.1',
          flush: false,
          ttl: 100,
        },
      ],
    };
    const result = encode(packet);
    expect(utils.toHex(result)).toBe(
      '1234010000000001000000000474657374000001000100000064000401010101'
    );
  });

  it('returns Uint8Array', () => {
    const packet: Packet = {
      id: 0,
      type: PacketType.QUERY,
      flags: 0,
    };
    const result = encode(packet);
    expect(result).toBeInstanceOf(Uint8Array);
  });
});

describe('streamEncode', () => {
  it('encodes with 2-byte length prefix', () => {
    const packet: Packet = {
      id: 0x1234,
      type: PacketType.QUERY,
      flags: PacketFlag.RECURSION_DESIRED,
    };
    const result = streamEncode(packet);
    const lengthPrefix = (result[0] << 8) | result[1];
    expect(lengthPrefix).toBe(encodingLength(packet) + 2);
    expect(result.length).toBe(lengthPrefix);
    expect(utils.toHex(result.slice(2))).toBe('123401000000000000000000');
  });

  it('encodes packet with question with length prefix', () => {
    const packet: Packet = {
      id: 0x1234,
      type: PacketType.QUERY,
      flags: PacketFlag.RECURSION_DESIRED,
      questions: [
        {
          name: 'test',
          type: RecordType.A,
          class: RecordClass.ANY,
        },
      ],
    };
    const result = streamEncode(packet);
    const lengthPrefix = (result[0] << 8) | result[1];
    expect(lengthPrefix).toBe(encodingLength(packet) + 2);
    expect(result.length).toBe(lengthPrefix);
  });

  it('returns Uint8Array', () => {
    const packet: Packet = {
      id: 0,
      type: PacketType.QUERY,
      flags: 0,
    };
    const result = streamEncode(packet);
    expect(result).toBeInstanceOf(Uint8Array);
  });
});

describe('encodingLength', () => {
  it('returns correct length for empty packet', () => {
    const packet: Packet = {
      id: 0,
      type: PacketType.QUERY,
      flags: 0,
    };
    expect(encodingLength(packet)).toBe(12);
  });

  it('returns correct length for packet with question', () => {
    const packet: Packet = {
      id: 0x1234,
      type: PacketType.QUERY,
      flags: PacketFlag.RECURSION_DESIRED,
      questions: [
        {
          name: 'test',
          type: RecordType.A,
          class: RecordClass.ANY,
        },
      ],
    };
    const encoded = encode(packet);
    expect(encodingLength(packet)).toBe(encoded.length);
  });

  it('returns correct length for packet with answer', () => {
    const packet: Packet = {
      id: 0x1234,
      type: PacketType.QUERY,
      flags: PacketFlag.RECURSION_DESIRED,
      answers: [
        {
          type: RecordType.A,
          name: 'test',
          class: RecordClass.IN,
          data: '1.1.1.1',
          flush: false,
          ttl: 100,
        },
      ],
    };
    const encoded = encode(packet);
    expect(encodingLength(packet)).toBe(encoded.length);
  });

  it('matches encoded output length', () => {
    const packet: Packet = {
      id: 0x1234,
      type: PacketType.QUERY,
      flags: PacketFlag.RECURSION_DESIRED,
      questions: [
        {
          name: 'example.com',
          type: RecordType.A,
          class: RecordClass.IN,
        },
      ],
      answers: [
        {
          type: RecordType.A,
          name: 'example.com',
          class: RecordClass.IN,
          data: '93.184.216.34',
          flush: false,
          ttl: 3600,
        },
      ],
    };
    expect(encodingLength(packet)).toBe(encode(packet).length);
  });
});

describe('roundtrip', () => {
  it('encode then decode returns equivalent packet', () => {
    const original: Packet = {
      id: 0xabcd,
      type: PacketType.RESPONSE,
      flags: PacketFlag.RECURSION_DESIRED | PacketFlag.RECURSION_AVAILABLE,
      questions: [
        {
          name: 'example.com',
          type: RecordType.A,
          class: RecordClass.IN,
          qu: false,
        },
      ],
      answers: [
        {
          type: RecordType.A,
          name: 'example.com',
          class: RecordClass.IN,
          data: '93.184.216.34',
          flush: false,
          ttl: 3600,
        },
      ],
    };
    const encoded = encode(original);
    const decoded = decode(encoded);
    expect(decoded.id).toBe(original.id);
    expect(decoded.type).toBe(original.type);
    expect(decoded.questions).toEqual(original.questions);
    expect(decoded.answers).toEqual(original.answers);
  });

  it('streamEncode then streamDecode returns equivalent packet', () => {
    const original: Packet = {
      id: 0x5678,
      type: PacketType.QUERY,
      flags: PacketFlag.RECURSION_DESIRED,
      questions: [
        {
          name: 'test.local',
          type: RecordType.AAAA,
          class: RecordClass.IN,
          qu: false,
        },
      ],
    };
    const encoded = streamEncode(original);
    const decoded = streamDecode(encoded);
    expect(decoded.id).toBe(original.id);
    expect(decoded.type).toBe(original.type);
    expect(decoded.questions).toEqual(original.questions);
  });
});

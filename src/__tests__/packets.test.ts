import { describe } from 'vitest';
import { packet } from '../packets';
import { PacketType, PacketFlag, RecordType, RecordClass } from '../constants';
import * as utils from './utils';

describe('packetEncoder', () => {
  const packetFixtures = utils.fixtures(packet, [
    // 12 zero bytes = empty query packet
    {
      case: 'empty',
      output: '000000000000000000000000',
      input: {
        id: 0,
        rtype: PacketFlag.NOERR,
        type: PacketType.QUERY,
        flags: 0,
      },
    },
    // ID=0x1234, flags=0x0100 (RD=1), counts=0
    {
      case: 'RD',
      output: '123401000000000000000000',
      input: {
        id: 0x1234,
        rtype: PacketFlag.NOERR,
        type: PacketType.QUERY,
        flags: PacketFlag.RECURSION_DESIRED,
      },
    },
    // ID=0xabcd, flags=0x8180 (QR=1,RD=1,RA=1), counts=0
    {
      case: 'RD RA',
      output: 'abcd81800000000000000000',
      input: {
        id: 0xabcd,
        rtype: PacketFlag.NOERR,
        type: PacketType.RESPONSE,
        flags:
          PacketFlag.RECURSION_DESIRED |
          PacketFlag.RECURSION_AVAILABLE |
          PacketType.RESPONSE,
      },
    },

    {
      case: 'question (1)',
      output: '123401000001000000000000047465737400000100ff',
      input: {
        id: 0x1234,
        rtype: PacketFlag.NOERR,
        type: PacketType.QUERY,
        flags: PacketFlag.RECURSION_DESIRED,
        questions: [
          {
            name: 'test',
            type: RecordType.A,
            class: RecordClass.ANY,
            qu: false,
          },
        ],
      },
    },

    {
      case: 'question (2)',
      output: '123401000002000000000000016100000100ff016200001c0001',
      input: {
        id: 0x1234,
        rtype: PacketFlag.NOERR,
        type: PacketType.QUERY,
        flags: PacketFlag.RECURSION_DESIRED,
        questions: [
          {
            name: 'a',
            type: RecordType.A,
            class: RecordClass.ANY,
            qu: false,
          },
          {
            name: 'b',
            type: RecordType.AAAA,
            class: RecordClass.IN,
            qu: false,
          },
        ],
      },
    },

    {
      case: 'answer (1)',
      output:
        '1234010000000001000000000474657374000001000100000064000401010101',
      input: {
        id: 0x1234,
        rtype: PacketFlag.NOERR,
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
      },
    },

    {
      case: 'additionals (1)',
      output:
        '1234010000000000000000010474657374000001000100000064000401010101',
      input: {
        id: 0x1234,
        rtype: PacketFlag.NOERR,
        type: PacketType.QUERY,
        flags: PacketFlag.RECURSION_DESIRED,
        additionals: [
          {
            type: RecordType.A,
            name: 'test',
            class: RecordClass.IN,
            data: '1.1.1.1',
            flush: false,
            ttl: 100,
          },
        ],
      },
    },

    {
      case: 'rtype = NXDOMAIN',
      output:
        '1234010300000000000000010474657374000001000100000064000401010101',
      input: {
        id: 0x1234,
        rtype: PacketFlag.NXDOMAIN,
        type: PacketType.QUERY,
        flags: PacketFlag.RECURSION_DESIRED | PacketFlag.NXDOMAIN,
        additionals: [
          {
            type: RecordType.A,
            name: 'test',
            class: RecordClass.IN,
            data: '1.1.1.1',
            flush: false,
            ttl: 100,
          },
        ],
      },
    },

    {
      case: 'full',
      output:
        '123401000001000100010001047465737400000100ff047465737400000100010000006400040101010104746573740000010001000000640004010101010474657374000001000100000064000401010101',
      input: {
        id: 0x1234,
        rtype: PacketFlag.NOERR,
        type: PacketType.QUERY,
        flags: PacketFlag.RECURSION_DESIRED,
        questions: [
          {
            name: 'test',
            type: RecordType.A,
            class: RecordClass.ANY,
            qu: false,
          },
        ],
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
        additionals: [
          {
            type: RecordType.A,
            name: 'test',
            class: RecordClass.IN,
            data: '1.1.1.1',
            flush: false,
            ttl: 100,
          },
        ],
        authorities: [
          {
            type: RecordType.A,
            name: 'test',
            class: RecordClass.IN,
            data: '1.1.1.1',
            flush: false,
            ttl: 100,
          },
        ],
      },
    },
  ]);

  packetFixtures.test();
});

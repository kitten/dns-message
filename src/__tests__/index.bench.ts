import { describe, bench } from 'vitest';

import * as message from './fixtures/lib';

const DECODED: message.Packet = {
  id: 0xabcd,
  type: message.PacketType.RESPONSE,
  flags:
    message.PacketFlag.RECURSION_DESIRED |
    message.PacketFlag.RECURSION_AVAILABLE,
  questions: [
    {
      name: 'example.com',
      type: message.RecordType.A,
      class: message.RecordClass.IN,
      qu: false,
    },
  ],
  answers: [
    {
      type: message.RecordType.A,
      name: 'example.com',
      class: message.RecordClass.IN,
      data: '93.184.216.34',
      flush: false,
      ttl: 3600,
    },
  ],
};

const ENCODED = message.encode(DECODED);

describe('decode', () => {
  bench('dns-message', () => {
    message.decode(ENCODED);
  });
});

describe('decode', () => {
  bench('dns-message', () => {
    message.encode(DECODED);
  });
});

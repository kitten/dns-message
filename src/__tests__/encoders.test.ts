import { describe, it, expect } from 'vitest';

import * as utils from './utils';
import { RecordType } from '../constants';

import {
  name,
  bytes,
  string,
  typeBitmap,
  ipv4,
  ipv6,
  withRDLength,
  array,
  advance,
  encodeIntoBuffer,
  sliceView,
  type ReadPosition,
} from '../encoders';

describe('name', () => {
  const nameFixtures = utils.fixtures(name, [
    {
      case: 'root (canonical)',
      output: '00',
      input: '.',
    },
    {
      case: '1 label',
      output: `03 ${utils.u2h('com')} 00`,
      input: 'com',
    },
    {
      case: '2 labels',
      output: `07 ${utils.u2h('example')} 03 ${utils.u2h('com')} 00`,
      input: 'example.com',
    },
    {
      case: '3 labels',
      output: `03 ${utils.u2h('www')} 07 ${utils.u2h('example')} 03 ${utils.u2h('com')} 00`,
      input: 'www.example.com',
    },
    {
      case: 'single char',
      output: '01 61 01 62 01 63 00',
      input: 'a.b.c',
    },
    {
      case: 'mail input',
      output: `03 ${utils.u2h('x.y')} 00`,
      input: 'x\\.y',
    },
  ]);

  nameFixtures.test();

  it('normalizes root names to canonical form', () => {
    expect(utils.toHex(encodeIntoBuffer(name, ''))).toBe('00');
    expect(utils.toHex(encodeIntoBuffer(name, '.'))).toBe('00');
    expect(utils.toHex(encodeIntoBuffer(name, '..'))).toBe('00');
  });

  it('normalizes leading and trailing dots to canonical form', () => {
    expect(utils.toHex(encodeIntoBuffer(name, 'com.'))).toBe('03636f6d00');
    expect(utils.toHex(encodeIntoBuffer(name, '.com.'))).toBe('03636f6d00');
    expect(utils.toHex(encodeIntoBuffer(name, 'com'))).toBe('03636f6d00');
  });

  it('supports escaped mail inputs', () => {
    expect(utils.toHex(encodeIntoBuffer(name, 'test\\.com'))).toBe(
      utils.toHex(`08 ${utils.u2h('test.com')} 00`)
    );
  });

  it('supports label references', () => {
    const view = utils.view(
      `03 ${utils.u2h('def')} 00 03 ${utils.u2h('abc')} c000`
    );
    const output = name.read(view, { offset: 5, length: view.byteLength });
    expect(output).toBe('abc.def');
  });

  it('is resilient to infinite loop references', () => {
    const view = utils.view(`03 ${utils.u2h('abc')} c000 0000 0000`);
    const output = name.read(view, { offset: 0, length: view.byteLength });
    expect(output).toBe('abc');
  });
});

describe('bytes', () => {
  const bytesFixtures = utils.fixtures(bytes, [
    {
      case: 'empty',
      output: '',
      input: new Uint8Array([]),
    },
    {
      case: 'test',
      output: 'deadbeef',
      input: new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
    },
  ]);

  bytesFixtures.test();
});

describe('string', () => {
  const stringFixtures = utils.fixtures(string, [
    {
      case: 'empty',
      output: '00',
      input: '',
    },
    {
      case: 'hello',
      output: `05 ${utils.u2h('hello')}`,
      input: 'hello',
    },
    {
      case: 'UTF-8',
      output: '07686920f09f9880',
      input: 'hi 😀',
    },
  ]);

  stringFixtures.test();
});

describe('ipv4', () => {
  const ipv4Fixtures = utils.fixtures(ipv4, [
    {
      case: 'zeros',
      output: '00000000',
      input: '0.0.0.0',
    },
    {
      case: 'localhost',
      output: '7f000001',
      input: '127.0.0.1',
    },
    {
      case: 'google',
      output: '08080808',
      input: '8.8.8.8',
    },
    {
      case: 'cloudflare',
      output: '01010101',
      input: '1.1.1.1',
    },
    {
      case: 'broadcast',
      output: 'ffffffff',
      input: '255.255.255.255',
    },
  ]);

  ipv4Fixtures.test();
});

describe('ipv6', () => {
  const ipv6Fixtures = utils.fixtures(ipv6, [
    {
      case: 'zeros',
      output: '00000000000000000000000000000000',
      input: '::',
    },
    {
      case: 'loopback',
      output: '00000000000000000000000000000001',
      input: '::1',
    },
    {
      case: 'sample',
      output: '20010db8000000000000000000000001',
      input: '2001:db8::1',
    },
  ]);

  ipv6Fixtures.test();

  it('supports IPv4 notation', () => {
    const actual = utils.roundtrip(ipv6, '::ffff:1.2.3.4');
    expect(actual).toBe('::ffff:102:304');
  });
});

describe('typeBitmap', () => {
  const typeBitmapFixtures = utils.fixtures(typeBitmap, [
    {
      case: 'empty',
      output: '',
      input: [],
    },
    {
      case: 'single entry',
      output: '000140',
      input: [RecordType.A],
    },
    {
      case: 'example',
      output: '000440010008',
      input: [RecordType.A, RecordType.AAAA, RecordType.MX].sort(),
    },
  ]);

  typeBitmapFixtures.test();
});

describe('withRDLength', () => {
  const wrappedBytes = withRDLength(bytes);
  const rdlengthFixtures = utils.fixtures(wrappedBytes, [
    {
      case: 'empty',
      output: '0000',
      input: new Uint8Array([]),
    },
    {
      case: 'example',
      output: '0004 deadbeef',
      input: new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
    },
  ]);

  rdlengthFixtures.test();
});

describe('array', () => {
  const arrayString = array(string);
  const arrayFixtures = utils.fixtures(arrayString, [
    {
      case: 'empty',
      output: '',
      input: [],
    },
    {
      case: 'example',
      output: '01610162',
      input: ['a', 'b'],
    },
  ]);

  arrayFixtures.test();
});

describe('advance', () => {
  it('increments offset and decrements length', () => {
    const pos: ReadPosition = { offset: 0, length: 100 };
    advance(pos, 10);
    expect(pos.offset).toBe(10);
    expect(pos.length).toBe(90);
  });

  it('handles advancing to end', () => {
    const pos: ReadPosition = { offset: 5, length: 10 };
    advance(pos, 10);
    expect(pos.offset).toBe(15);
    expect(pos.length).toBe(0);
  });
});

describe('encodeIntoBuffer', () => {
  it('creates correctly sized buffer', () => {
    expect(utils.toHex(encodeIntoBuffer(ipv4, '1.2.3.4'))).toBe('01020304');
  });
});

describe('sliceView', () => {
  it('extracts bytes and advances position', () => {
    const v = utils.view('0102030405');
    const pos: ReadPosition = { offset: 0, length: 5 };
    const result = sliceView(v, pos, 3);
    expect(utils.toHex(result)).toBe('010203');
    expect(pos.offset).toBe(3);
    expect(pos.length).toBe(2);
  });

  it('uses remaining length when not specified', () => {
    const v = utils.view('aabbccdd');
    const pos: ReadPosition = { offset: 0, length: 4 };
    const result = sliceView(v, pos);
    expect(utils.toHex(result)).toBe('aabbccdd');
    expect(pos.offset).toBe(4);
    expect(pos.length).toBe(0);
  });
});

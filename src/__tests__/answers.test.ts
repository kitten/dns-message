import { describe, it, expect } from 'vitest';

import { RecordType, RecordClass } from '../constants';
import * as utils from './utils';

import {
  answerTxt,
  answerHInfo,
  answerMx,
  answerSrv,
  answerCaa,
  answerSoa,
  answerDnskey,
  answerRrsig,
  answerRp,
  answerNsec,
  answerNsec3,
  answerSshfp,
  answerDs,
  answerNaptr,
  answerTlsa,
  answerSvcb,
  answerOpt,
  answer,
} from '../answers';

describe('answerTxt', () => {
  const txtFixtures = utils.fixtures(answerTxt, [
    {
      case: 'empty',
      output: '0000',
      input: [],
    },
    {
      case: 'single string',
      output: `0003 02 ${utils.u2h('hi')}`,
      input: ['hi'],
    },
    {
      case: 'multiple strings',
      output: `0006 02 ${utils.u2h('hi')} 02 ${utils.u2h('yo')}`,
      input: ['hi', 'yo'],
    },
  ]);

  txtFixtures.test();
});

describe('answerHInfo', () => {
  const hinfoFixtures = utils.fixtures(answerHInfo, [
    {
      case: 'empty',
      output: '0002 00 00',
      input: { cpu: '', os: '' },
    },
    {
      case: 'basic',
      output: '000a 03 783836 05 4c696e7578',
      input: { cpu: 'x86', os: 'Linux' },
    },
  ]);

  hinfoFixtures.test();
});

describe('answerMx', () => {
  const mxFixtures = utils.fixtures(answerMx, [
    {
      case: 'basic',
      output: `0011 0000 07 ${utils.u2h('example')} 05 ${utils.u2h('local')} 00`,
      input: { preference: 0, exchange: 'example.local' },
    },
    {
      case: 'with preference',
      output: `0014 000a 04 ${utils.u2h('mail')} 07 ${utils.u2h('example')} 03 ${utils.u2h('com')} 00`,
      input: { preference: 10, exchange: 'mail.example.com' },
    },
  ]);

  mxFixtures.test();
});

describe('answerSrv', () => {
  const srvFixtures = utils.fixtures(answerSrv, [
    {
      case: 'basic',
      output: `0010 0000 0000 0050 03 ${utils.u2h('www')} 04 ${utils.u2h('test')} 00`,
      input: {
        priority: 0,
        weight: 0,
        port: 80,
        target: 'www.test',
      },
    },
    {
      case: 'with priority & weight',
      output: `0013 000a 0064 005a 07 ${utils.u2h('example')} 03 ${utils.u2h('com')} 00`,
      input: {
        priority: 10,
        weight: 100,
        port: 90,
        target: 'example.com',
      },
    },
  ]);

  srvFixtures.test();
});

describe('answerCaa', () => {
  const caaFixtures = utils.fixtures(answerCaa, [
    {
      case: 'basic',
      output: `000a 00 05 ${utils.u2h('issue')} 010203`,
      input: {
        flags: 0,
        tag: 'issue',
        value: new Uint8Array([1, 2, 3]),
        issuerCritical: false,
      },
    },
    {
      case: 'with flags',
      output: `000e 80 09 ${utils.u2h('issuewild')} 010203`,
      input: {
        flags: (1 << 7) | 128,
        tag: 'issuewild',
        value: new Uint8Array([1, 2, 3]),
        issuerCritical: true,
      },
    },
  ]);

  caaFixtures.test();

  it('normalizes parsed CAA tags to "issue"', () => {
    const actual = utils.roundtrip(answerCaa, {
      flags: (1 << 7) | 128,
      tag: 'INVALID' as any,
      value: new Uint8Array([1, 2, 3]),
      issuerCritical: true,
    });
    expect(actual).toEqual({
      flags: (1 << 7) | 128,
      tag: 'issue',
      value: new Uint8Array([1, 2, 3]),
      issuerCritical: true,
    });
  });
});

describe('answerSoa', () => {
  const soaFixtures = utils.fixtures(answerSoa, [
    {
      case: 'example',
      output: `
        0038
        03 ${utils.u2h('ns1')} 07 ${utils.u2h('example')} 03 ${utils.u2h('com')} 00
        05 ${utils.u2h('admin')} 07 ${utils.u2h('example')} 03 ${utils.u2h('com')} 00
        78762ab5 00000e10 00000258 00093a80 00015180
      `,
      input: {
        mname: 'ns1.example.com',
        rname: 'admin.example.com',
        serial: 2021010101,
        refresh: 3600,
        retry: 600,
        expire: 604800,
        minimum: 86400,
      },
    },
  ]);

  soaFixtures.test();
});

describe('answerDnskey', () => {
  const dnskeyFixtures = utils.fixtures(answerDnskey, [
    {
      case: 'example',
      output: `0008 0101 03 0d deadbeef`,
      input: {
        flags: 257,
        algorithm: 13,
        key: new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
      },
    },
  ]);

  dnskeyFixtures.test();
});

describe('answerRrsig', () => {
  const rrsigFixtures = utils.fixtures(answerRrsig, [
    {
      case: 'example',
      output: `
        0023
        0001 0d 02 00000e10 61c06a00 6127d380 3039
        07 ${utils.u2h('example')} 03 ${utils.u2h('com')} 00
        deadbeef
      `,
      input: {
        typeCovered: RecordType.A,
        algorithm: 13,
        labels: 2,
        originalTTL: 3600,
        expiration: 1640000000,
        inception: 1630000000,
        keyTag: 12345,
        signersName: 'example.com',
        signature: new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
      },
    },
  ]);

  rrsigFixtures.test();
});

describe('answerRp', () => {
  const rpFixtures = utils.fixtures(answerRp, [
    {
      case: 'example',
      output: `
        0025
        05 ${utils.u2h('admin')} 07 ${utils.u2h('example')} 03 ${utils.u2h('com')} 00
        04 ${utils.u2h('info')} 07 ${utils.u2h('example')} 03 ${utils.u2h('com')} 00
      `,
      input: {
        mbox: 'admin.example.com',
        txt: 'info.example.com',
      },
    },
  ]);

  rpFixtures.test();
});

describe('answerNsec', () => {
  const nsecFixtures = utils.fixtures(answerNsec, [
    {
      case: 'empty',
      output: `0005 01 61 01 62 00`,
      input: {
        nextDomain: 'a.b',
        rrtypes: [],
      },
    },
    {
      case: 'basic',
      output: `0010 04 ${utils.u2h('test')} 03 ${utils.u2h('com')} 00 000440010008`,
      input: {
        nextDomain: 'test.com',
        rrtypes: [RecordType.A, RecordType.AAAA, RecordType.MX].sort(),
      },
    },
  ]);

  nsecFixtures.test();
});

describe('answerNsec3', () => {
  const nsec3Fixtures = utils.fixtures(answerNsec3, [
    {
      case: 'example',
      output: '000b 01 80 000a 0101 0102 000160',
      input: {
        algorithm: 1,
        flags: 128,
        iterations: 10,
        salt: new Uint8Array([1]),
        nextDomain: new Uint8Array([2]),
        rrtypes: [RecordType.A, RecordType.NS].sort(),
      },
    },
  ]);

  nsec3Fixtures.test();
});

describe('answerSshfp', () => {
  const sshfpFixtures = utils.fixtures(answerSshfp, [
    {
      case: 'empty',
      output: `0002 00 00`,
      input: {
        algorithm: 0,
        hash: 0,
        fingerprint: new Uint8Array([]),
      },
    },
    {
      case: 'basic',
      output: `0006 01 01 deadbeef`,
      input: {
        algorithm: 1,
        hash: 1,
        fingerprint: new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
      },
    },
  ]);

  sshfpFixtures.test();
});

describe('answerDs', () => {
  const dsFixtures = utils.fixtures(answerDs, [
    {
      case: 'example',
      output: `0008 3039 08 02 deadbeef`,
      input: {
        keyTag: 12345,
        algorithm: 8,
        digestType: 2,
        digest: new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
      },
    },
  ]);

  dsFixtures.test();
});

describe('answerTlsa', () => {
  const tlsaFixtures = utils.fixtures(answerTlsa, [
    {
      case: 'example',
      output: `0007 03 01 02 deadbeef`,
      input: {
        usage: 3,
        selector: 1,
        matchingType: 2,
        certificate: new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
      },
    },
  ]);

  tlsaFixtures.test();
});

describe('answerNaptr', () => {
  const naptrFixtures = utils.fixtures(answerNaptr, [
    {
      case: 'example',
      output: `
        002b
        0064 000a
        01 ${utils.u2h('u')}
        07 ${utils.u2h('E2U+sip')}
        1b ${utils.u2h('!^.*$!sip:info@example.com!')}
        00
      `,
      input: {
        order: 100,
        preference: 10,
        flags: 'u',
        services: 'E2U+sip',
        regexp: '!^.*$!sip:info@example.com!',
        replacement: '.',
      },
    },
  ]);

  naptrFixtures.test();
});

describe('answerSvcb', () => {
  const svcbFixtures = utils.fixtures(answerSvcb, [
    {
      case: 'example',
      output: '000e000a047465737400000100020161',
      input: {
        name: 'test',
        priority: 10,
        params: {
          alpn: ['a'],
          'no-default-alpn': false,
        },
      },
    },
  ]);

  svcbFixtures.test();
});

describe('answerOpt', () => {
  const optFixtures = utils.fixtures(answerOpt, [
    {
      case: 'example',
      output: `000c 0080 0002 dead 0100 0002 beef`,
      input: [
        { code: 128, data: new Uint8Array([0xde, 0xad]) },
        { code: 256, data: new Uint8Array([0xbe, 0xef]) },
      ],
    },
  ]);

  optFixtures.test();
});

describe('answer', () => {
  const answerFixtures = utils.fixtures(answer, [
    {
      case: 'A record',
      output: `04 ${utils.u2h('test')} 00 0001 0001 0000012c 0004 01020304`,
      input: {
        name: 'test',
        type: RecordType.A,
        class: RecordClass.IN,
        ttl: 300,
        flush: false,
        data: '1.2.3.4',
      },
    },
    {
      case: 'AAAA record',
      output: `04 ${utils.u2h('ipv6')} 04 ${utils.u2h('test')} 00 001c 0001 00000258 0010 20010db8000000000000000000000001`,
      input: {
        name: 'ipv6.test',
        type: RecordType.AAAA,
        class: RecordClass.IN,
        ttl: 600,
        flush: false,
        data: '2001:db8::1',
      },
    },
    {
      case: 'OPT record',
      output: '0000290400010200000000',
      input: {
        type: RecordType.OPT,
        udpPayloadSize: 1024,
        extendedRcode: 1,
        ednsVersion: 2,
        flags: 0,
        data: [],
      },
    },
    {
      case: 'flush byte',
      output: `04 ${utils.u2h('test')} 00 0001 8001 0000012c 0004 01010101`,
      input: {
        name: 'test',
        type: RecordType.A,
        class: RecordClass.IN,
        ttl: 300,
        flush: true,
        data: '1.1.1.1',
      },
    },
    {
      case: 'CNAME',
      output: `06 ${utils.u2h('source')} 00 00050001000000000008 06 ${utils.u2h('target')} 00`,
      input: {
        name: 'source',
        type: RecordType.CNAME,
        class: RecordClass.IN,
        ttl: 0,
        flush: false,
        data: 'target',
      },
    },
    {
      case: 'PTR',
      output: `06 ${utils.u2h('source')} 00 000c0001000000000008 06 ${utils.u2h('target')} 00`,
      input: {
        name: 'source',
        type: RecordType.PTR,
        class: RecordClass.IN,
        ttl: 0,
        flush: false,
        data: 'target',
      },
    },
    {
      case: 'DNAME',
      output: `06 ${utils.u2h('source')} 00 00270001000000000008 06 ${utils.u2h('target')} 00`,
      input: {
        name: 'source',
        type: RecordType.DNAME,
        class: RecordClass.IN,
        ttl: 0,
        flush: false,
        data: 'target',
      },
    },
  ]);

  answerFixtures.test();
});

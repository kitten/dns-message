import { describe, it, expect } from 'vitest';

import * as utils from './utils';
import { OptCode } from '../constants';

import {
  unknownOpt,
  keepAliveOpt,
  paddingOpt,
  tagOpt,
  clientSubnetOpt,
  option,
  IPType,
} from '../options';

describe('unknownOpt', () => {
  const unknownOptFixtures = utils.fixtures(unknownOpt, [
    // Empty data: rdlength=0
    {
      case: 'empty',
      output: '0000',
      input: {
        code: 0,
        data: new Uint8Array([]),
      },
    },
    // Test data: rdlength=4
    {
      case: 'empty',
      output: '0004 deadbeef',
      input: {
        code: 0,
        data: new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
      },
    },
  ]);

  unknownOptFixtures.test();
});

describe('keepAliveOpt', () => {
  const keepAliveOptFixtures = utils.fixtures(keepAliveOpt, [
    {
      case: 'no timeout',
      output: '0000',
      input: { code: OptCode.TCP_KEEPALIVE },
    },
    {
      case: 'with 1,200',
      output: '0002 04b0',
      input: { code: OptCode.TCP_KEEPALIVE, timeout: 1200 },
    },
    {
      case: 'max timeout',
      output: '0002 ffff',
      input: { code: OptCode.TCP_KEEPALIVE, timeout: 65535 },
    },
  ]);

  keepAliveOptFixtures.test();
});

describe('paddingOpt', () => {
  const paddingOptFixtures = utils.fixtures(paddingOpt, [
    {
      case: '5 bytes',
      output: '0005 0000000000',
      input: { code: OptCode.PADDING, length: 5 },
    },
    {
      case: '10 bytes',
      output: '000a 00000000000000000000',
      input: { code: OptCode.PADDING, length: 10 },
    },
  ]);

  paddingOptFixtures.test();
});

describe('tagOpt', () => {
  const tagOptFixtures = utils.fixtures(tagOpt, [
    {
      case: 'empty',
      output: '0000',
      input: { code: OptCode.KEY_TAG, tags: [] },
    },
    {
      case: 'single tag',
      output: '0002 1234',
      input: { code: OptCode.KEY_TAG, tags: [0x1234] },
    },
    {
      case: 'multiple tags',
      output: '0006 0001 0002 0003',
      input: { code: OptCode.KEY_TAG, tags: [1, 2, 3] },
    },
  ]);

  tagOptFixtures.test();
});

describe('clientSubnetOpt', () => {
  const clientSubnetOptFixtures = utils.fixtures(clientSubnetOpt, [
    // family=1 (IPv4), source prefix=24, scope prefix=0, first 3 octets of 192.168.1.x
    {
      case: 'ipv4 (3)',
      output: '0007 0001 18 00 c0a801',
      input: {
        code: OptCode.CLIENT_SUBNET,
        family: IPType.v4,
        sourcePrefixLength: 24,
        scopePrefixLength: 0,
        ip: '192.168.1.0',
      },
    },
    // family=1 (IPv4), source prefix=32, scope prefix=10, first 4 octets of 192.168.1.1
    {
      case: 'ipv4 (4)',
      output: '0008 0001 20 0a c0a80101',
      input: {
        code: OptCode.CLIENT_SUBNET,
        family: IPType.v4,
        sourcePrefixLength: 32,
        scopePrefixLength: 10,
        ip: '192.168.1.1',
      },
    },
    // family=2 (IPv6), source prefix=32, scope prefix=10, first 4 octets of 192.168.1.1
    {
      case: 'ipv6',
      output: '000c0002400a2002000000000000',
      input: {
        code: OptCode.CLIENT_SUBNET,
        family: IPType.v6,
        sourcePrefixLength: 64,
        scopePrefixLength: 10,
        ip: '2002::',
      },
    },
  ]);

  clientSubnetOptFixtures.test();

  it('infers IPv4/IPv6 types', () => {
    let output = utils.roundtrip(clientSubnetOpt, {
      code: OptCode.CLIENT_SUBNET,
      sourcePrefixLength: 32,
      scopePrefixLength: 10,
      ip: '192.168.1.1',
    });

    expect(output).toEqual({
      code: OptCode.CLIENT_SUBNET,
      family: IPType.v4,
      sourcePrefixLength: 32,
      scopePrefixLength: 10,
      ip: '192.168.1.1',
    });

    output = utils.roundtrip(clientSubnetOpt, {
      code: OptCode.CLIENT_SUBNET,
      sourcePrefixLength: 64,
      scopePrefixLength: 10,
      ip: '2002::',
    });

    expect(output).toEqual({
      code: OptCode.CLIENT_SUBNET,
      family: IPType.v6,
      sourcePrefixLength: 64,
      scopePrefixLength: 10,
      ip: '2002::',
    });
  });
});

describe('option', () => {
  const optionFixtures = utils.fixtures(option, [
    // TCP_KEEPALIVE = 11 = 0x000b
    {
      case: 'keep-alive',
      output: '000b 0002 0064',
      input: {
        code: OptCode.TCP_KEEPALIVE,
        timeout: 100,
      },
    },
    // PADDING = 12 = 0x000c
    {
      case: 'padding',
      output: '000c 000c 000000000000000000000000',
      input: {
        code: OptCode.PADDING,
        length: 12,
      },
    },
    // KEY_TAG = 14 = 0x000e
    {
      case: 'key tags',
      output: '000e 0004 0001 0002',
      input: {
        code: OptCode.KEY_TAG,
        tags: [1, 2],
      },
    },
    // Unknown option
    {
      case: 'unknown',
      output: '0100 0002 dead',
      input: {
        code: 256,
        data: new Uint8Array([0xde, 0xad]),
      },
    },
    // subnet opt
    {
      case: 'client subnet',
      output: '0008 0004 00010000',
      input: {
        code: OptCode.CLIENT_SUBNET,
        family: IPType.v4,
        sourcePrefixLength: 0,
        scopePrefixLength: 0,
        ip: '0.0.0.0',
      },
    },
  ]);

  optionFixtures.test();
});

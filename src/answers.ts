import { RecordClass, RecordType } from './constants';
import { Encoder, advance, encodeIntoBuffer, octets } from './encoders';
import { option, PacketOpt } from './options';
import { svcParams, SvcParams } from './svcparams';
import {
  withRDLength,
  typeBitmap,
  string,
  bytes,
  name,
  ipv4,
  ipv6,
  array,
} from './encoders';

export interface BaseAnswer {
  type: RecordType;
  name: string;
  ttl?: number;
  class?: RecordClass;
  flush?: boolean;
}

const answerBytes = withRDLength(bytes);

export interface NsAnswer extends BaseAnswer {
  type: RecordType.NS;
  data: string;
}

const answerName = withRDLength(name);

export interface AAnswer extends BaseAnswer {
  type: RecordType.A;
  data: string;
}

const answerIPv4 = withRDLength(ipv4);

export interface AAAAAnswer extends BaseAnswer {
  type: RecordType.AAAA;
  data: string;
}

const answerIPv6 = withRDLength(ipv6);

export interface TxtAnswer extends BaseAnswer {
  type: RecordType.TXT;
  data: string[];
}

export const answerTxt: Encoder<string[]> = withRDLength(array(string));

export interface SrvData {
  priority?: number;
  weight?: number;
  port: number;
  target: string;
}

export interface SrvAnswer extends BaseAnswer {
  type: RecordType.SRV;
  data: SrvData;
}

export const answerSrv: Encoder<SrvData> = withRDLength({
  bytes(data) {
    return name.bytes(data.target) + 6;
  },
  write(view, offset, data) {
    view.setUint16(offset, data.priority || 0);
    view.setUint16(offset + 2, data.weight || 0);
    view.setUint16(offset + 4, data.port || 0);
    return name.write(view, offset + 6, data.target);
  },
  read(view, position) {
    const data: SrvData = { priority: 0, weight: 0, port: 0, target: '' };
    data.priority = view.getUint16(position.offset);
    data.weight = view.getUint16(position.offset + 2);
    data.port = view.getUint16(position.offset + 4);
    advance(position, 6);
    data.target = name.read(view, position);
    return data;
  },
});

export interface HInfoData {
  cpu: string;
  os: string;
}

export interface HInfoAnswer extends BaseAnswer {
  type: RecordType.HINFO;
  data: HInfoData;
}

export const answerHInfo: Encoder<HInfoData> = withRDLength({
  bytes(data) {
    return string.bytes(data.cpu) + string.bytes(data.os);
  },
  write(view, offset, data) {
    offset = string.write(view, offset, data.cpu);
    offset = string.write(view, offset, data.os);
    return offset;
  },
  read(view, position) {
    return {
      cpu: string.read(view, position),
      os: string.read(view, position),
    };
  },
});

export interface CaaData {
  flags?: number;
  tag: 'issue' | 'issuewild' | 'iodef';
  value: Uint8Array;
  issuerCritical?: boolean;
}

export interface CaaAnswer extends BaseAnswer {
  type: RecordType.CAA;
  data: CaaData;
}

const ISSUER_CRITICAL = 1 << 7;

const toCaaTag = (input: string) => {
  switch (input) {
    case 'issue':
    case 'issuewild':
    case 'iodef':
      return input;
    default:
      return 'issue';
  }
};

export const answerCaa: Encoder<CaaData> = withRDLength({
  bytes(data) {
    return string.bytes(data.tag) + bytes.bytes(data.value) + 1;
  },
  write(view, offset, data) {
    let flags = data.flags || 0;
    if (data.issuerCritical) flags |= ISSUER_CRITICAL;
    view.setUint8(offset, flags);
    offset = string.write(view, offset + 1, data.tag);
    offset = bytes.write(view, offset, data.value);
    return offset;
  },
  read(view, position) {
    const flags = view.getUint8(position.offset);
    advance(position, 1);
    return {
      flags,
      tag: toCaaTag(string.read(view, position)),
      value: bytes.read(view, position),
      issuerCritical: !!(flags & ISSUER_CRITICAL),
    };
  },
});

export interface SoaData {
  mname: string;
  rname: string;
  serial?: number;
  refresh?: number;
  retry?: number;
  expire?: number;
  minimum?: number;
}

export interface SoaAnswer extends BaseAnswer {
  type: RecordType.SOA;
  data: SoaData;
}

export const answerSoa: Encoder<SoaData> = withRDLength({
  bytes(data) {
    return name.bytes(data.mname) + name.bytes(data.rname) + 20;
  },
  write(view, offset, data) {
    offset = name.write(view, offset, data.mname);
    offset = name.write(view, offset, data.rname);
    view.setUint32(offset, data.serial || 0);
    view.setUint32(offset + 4, data.refresh || 0);
    view.setUint32(offset + 8, data.retry || 0);
    view.setUint32(offset + 12, data.expire || 0);
    view.setUint32(offset + 16, data.minimum || 0);
    return offset + 20;
  },
  read(view, position) {
    const data: SoaData = {
      mname: name.read(view, position),
      rname: name.read(view, position),
      serial: view.getUint32(position.offset),
      refresh: view.getUint32(position.offset + 4),
      retry: view.getUint32(position.offset + 8),
      expire: view.getUint32(position.offset + 12),
      minimum: view.getUint32(position.offset + 16),
    };
    position.offset += 20;
    position.length -= 20;
    return data;
  },
});

export interface MxData {
  preference?: number;
  exchange: string;
}

export interface MxAnswer extends BaseAnswer {
  type: RecordType.MX;
  data: MxData;
}

export const answerMx: Encoder<MxData> = withRDLength({
  bytes(data) {
    return name.bytes(data.exchange) + 2;
  },
  write(view, offset, data) {
    view.setUint16(offset, data.preference || 0);
    return name.write(view, offset + 2, data.exchange);
  },
  read(view, position) {
    const data: MxData = {
      preference: view.getUint16(position.offset),
      exchange: '',
    };
    advance(position, 2);
    data.exchange = name.read(view, position);
    return data;
  },
});

export interface DnskeyData {
  flags: number;
  algorithm: number;
  key: Uint8Array;
}

export interface DnskeyAnswer extends BaseAnswer {
  type: RecordType.DNSKEY;
  data: DnskeyData;
}

export const answerDnskey: Encoder<DnskeyData> = withRDLength({
  bytes(data) {
    return bytes.bytes(data.key) + 4;
  },
  write(view, offset, data) {
    const PROTOCOL_DNSSEC = 3;
    view.setUint16(offset, data.flags);
    view.setUint8(offset + 2, PROTOCOL_DNSSEC);
    view.setUint8(offset + 3, data.algorithm);
    return bytes.write(view, offset + 4, data.key);
  },
  read(view, position) {
    const flags = view.getUint16(position.offset);
    const algorithm = view.getUint8(position.offset + 3);
    advance(position, 4);
    return {
      flags,
      algorithm,
      key: bytes.read(view, position),
    };
  },
});

export interface RrsigData {
  typeCovered: RecordType;
  algorithm: number;
  labels: number;
  originalTTL: number;
  expiration: number;
  inception: number;
  keyTag: number;
  signersName: string;
  signature: Uint8Array;
}

export interface RrsigAnswer extends BaseAnswer {
  type: RecordType.RRSIG;
  data: RrsigData;
}

export const answerRrsig: Encoder<RrsigData> = withRDLength({
  bytes(data) {
    return 18 + name.bytes(data.signersName) + bytes.bytes(data.signature);
  },
  write(view, offset, data) {
    view.setUint16(offset, data.typeCovered);
    view.setUint8(offset + 2, data.algorithm);
    view.setUint8(offset + 3, data.labels);
    view.setUint32(offset + 4, data.originalTTL);
    view.setUint32(offset + 8, data.expiration);
    view.setUint32(offset + 12, data.inception);
    view.setUint16(offset + 16, data.keyTag);
    offset = name.write(view, offset + 18, data.signersName);
    offset = bytes.write(view, offset, data.signature);
    return offset;
  },
  read(view, position) {
    const typeCovered = view.getUint16(position.offset);
    const algorithm = view.getUint8(position.offset + 2);
    const labels = view.getUint8(position.offset + 3);
    const originalTTL = view.getUint32(position.offset + 4);
    const expiration = view.getUint32(position.offset + 8);
    const inception = view.getUint32(position.offset + 12);
    const keyTag = view.getUint16(position.offset + 16);
    advance(position, 18);
    return {
      typeCovered,
      algorithm,
      labels,
      originalTTL,
      expiration,
      inception,
      keyTag,
      signersName: name.read(view, position),
      signature: bytes.read(view, position),
    };
  },
});

export interface RpData {
  mbox: string;
  txt: string;
}

export interface RpAnswer extends BaseAnswer {
  type: RecordType.RP;
  data: RpData;
}

export const answerRp: Encoder<RpData> = withRDLength({
  bytes(data) {
    return name.bytes(data.mbox) + name.bytes(data.txt);
  },
  write(view, offset, data) {
    offset = name.write(view, offset, data.mbox);
    offset = name.write(view, offset, data.txt);
    return offset;
  },
  read(view, position) {
    return {
      mbox: name.read(view, position),
      txt: name.read(view, position),
    };
  },
});

export interface NsecData {
  nextDomain: string;
  rrtypes: RecordType[];
}

export interface NsecAnswer extends BaseAnswer {
  type: RecordType.NSEC;
  data: NsecData;
}

export const answerNsec: Encoder<NsecData> = withRDLength({
  bytes(data) {
    return name.bytes(data.nextDomain) + typeBitmap.bytes(data.rrtypes);
  },
  write(view, offset, data) {
    offset = name.write(view, offset, data.nextDomain);
    offset = typeBitmap.write(view, offset, data.rrtypes);
    return offset;
  },
  read(view, position) {
    return {
      nextDomain: name.read(view, position),
      rrtypes: typeBitmap.read(view, position),
    };
  },
});

export interface Nsec3Data {
  algorithm: number;
  flags: number;
  iterations: number;
  salt: Uint8Array;
  nextDomain: Uint8Array;
  rrtypes: RecordType[];
}

export interface Nsec3Answer extends BaseAnswer {
  type: RecordType.NSEC3;
  data: Nsec3Data;
}

export const answerNsec3: Encoder<Nsec3Data> = withRDLength({
  bytes(data) {
    return (
      octets.bytes(data.salt) +
      octets.bytes(data.nextDomain) +
      typeBitmap.bytes(data.rrtypes) +
      4
    );
  },
  write(view, offset, data) {
    view.setUint8(offset, data.algorithm);
    view.setUint8(offset + 1, data.flags);
    view.setUint16(offset + 2, data.iterations);
    offset = octets.write(view, offset + 4, data.salt);
    offset = octets.write(view, offset, data.nextDomain);
    offset = typeBitmap.write(view, offset, data.rrtypes);
    return offset;
  },
  read(view, position) {
    const algorithm = view.getUint8(position.offset);
    const flags = view.getUint8(position.offset + 1);
    const iterations = view.getUint16(position.offset + 2);
    advance(position, 4);
    return {
      algorithm,
      flags,
      iterations,
      salt: octets.read(view, position),
      nextDomain: octets.read(view, position),
      rrtypes: typeBitmap.read(view, position),
    };
  },
});

export interface SshfpData {
  algorithm: number;
  hash: number;
  fingerprint: Uint8Array;
}

export interface SshfpAnswer extends BaseAnswer {
  type: RecordType.SSHFP;
  data: SshfpData;
}

export const answerSshfp: Encoder<SshfpData> = withRDLength({
  bytes(data) {
    return bytes.bytes(data.fingerprint) + 2;
  },
  write(view, offset, data) {
    view.setUint8(offset, data.algorithm);
    view.setUint8(offset + 1, data.hash);
    return bytes.write(view, offset + 2, data.fingerprint);
  },
  read(view, position) {
    const algorithm = view.getUint8(position.offset);
    const hash = view.getUint8(position.offset + 1);
    advance(position, 2);
    return {
      algorithm,
      hash,
      fingerprint: bytes.read(view, position),
    };
  },
});

export interface DsData {
  keyTag: number;
  algorithm: number;
  digestType: number;
  digest: Uint8Array;
}

export interface DsAnswer extends BaseAnswer {
  type: RecordType.DS;
  data: DsData;
}

export const answerDs: Encoder<DsData> = withRDLength({
  bytes(data) {
    return bytes.bytes(data.digest) + 4;
  },
  write(view, offset, data) {
    view.setUint16(offset, data.keyTag);
    view.setUint8(offset + 2, data.algorithm);
    view.setUint8(offset + 3, data.digestType);
    offset = bytes.write(view, offset + 4, data.digest);
    return offset;
  },
  read(view, position) {
    const keyTag = view.getUint16(position.offset);
    const algorithm = view.getUint8(position.offset + 2);
    const digestType = view.getUint8(position.offset + 3);
    advance(position, 4);
    return {
      keyTag,
      algorithm,
      digestType,
      digest: bytes.read(view, position),
    };
  },
});

export interface NaptrData {
  order: number;
  preference: number;
  flags: string;
  services: string;
  regexp: string;
  replacement: string;
}

export interface NaptrAnswer extends BaseAnswer {
  type: RecordType.NAPTR;
  data: NaptrData;
}

export const answerNaptr: Encoder<NaptrData> = withRDLength({
  bytes(data) {
    return (
      string.bytes(data.flags) +
      string.bytes(data.services) +
      string.bytes(data.regexp) +
      name.bytes(data.replacement) +
      4
    );
  },
  write(view, offset, data) {
    view.setUint16(offset, data.order);
    view.setUint16(offset + 2, data.preference);
    offset = string.write(view, offset + 4, data.flags);
    offset = string.write(view, offset, data.services);
    offset = string.write(view, offset, data.regexp);
    offset = name.write(view, offset, data.replacement);
    return offset;
  },
  read(view, position) {
    const order = view.getUint16(position.offset);
    const preference = view.getUint16(position.offset + 2);
    advance(position, 4);
    return {
      order,
      preference,
      flags: string.read(view, position),
      services: string.read(view, position),
      regexp: string.read(view, position),
      replacement: name.read(view, position),
    };
  },
});

export interface TlsaData {
  usage: number;
  selector: number;
  matchingType: number;
  certificate: Uint8Array;
}

export interface TlsaAnswer extends BaseAnswer {
  type: RecordType.TLSA;
  data: TlsaData;
}

export const answerTlsa: Encoder<TlsaData> = withRDLength({
  bytes(data) {
    return bytes.bytes(data.certificate) + 3;
  },
  write(view, offset, data) {
    view.setUint8(offset, data.usage);
    view.setUint8(offset + 1, data.selector);
    view.setUint8(offset + 2, data.matchingType);
    return bytes.write(view, offset + 3, data.certificate);
  },
  read(view, position) {
    const usage = view.getUint8(position.offset);
    const selector = view.getUint8(position.offset + 1);
    const matchingType = view.getUint8(position.offset + 2);
    advance(position, 3);
    return {
      usage,
      selector,
      matchingType,
      certificate: bytes.read(view, position),
    };
  },
});

export interface SvcbData {
  name: string;
  priority?: number;
  params: SvcParams;
}

export interface SvcbAnswer extends BaseAnswer {
  type: RecordType.SVCB;
  data: SvcbData;
}

export interface HttpsAnswer extends BaseAnswer {
  type: RecordType.HTTPS;
  data: SvcbData;
}

export const answerSvcb: Encoder<SvcbData> = withRDLength({
  bytes(data) {
    return name.bytes(data.name) + svcParams.bytes(data.params) + 2;
  },
  write(view, offset, data) {
    view.setUint16(offset, data.priority || 0);
    offset = name.write(view, offset + 2, data.name);
    offset = svcParams.write(view, offset, data.params);
    return offset;
  },
  read(view, position) {
    const priority = view.getUint16(position.offset);
    advance(position, 2);
    return {
      name: name.read(view, position),
      priority,
      params: svcParams.read(view, position),
    };
  },
});

export interface OptAnswer {
  type: RecordType.OPT;
  name?: '.';
  udpPayloadSize: number;
  extendedRcode: number;
  ednsVersion: number;
  flags: number;
  data: PacketOpt[];
}

export const answerOpt: Encoder<PacketOpt[]> = withRDLength(array(option));

export interface PtrAnswer extends BaseAnswer {
  type: RecordType.PTR;
  data: string;
}

export interface CnameAnswer extends BaseAnswer {
  type: RecordType.CNAME;
  data: string;
}

export interface DnameAnswer extends BaseAnswer {
  type: RecordType.DNAME;
  data: string;
}

export interface NullAnswer extends BaseAnswer {
  type: RecordType.NULL;
  data: Uint8Array | string;
}

export interface UnknownAnswer extends BaseAnswer {
  type:
    | RecordType.AFSDB
    | RecordType.APL
    | RecordType.AXFR
    | RecordType.CDNSKEY
    | RecordType.CDS
    | RecordType.CERT
    | RecordType.DHCID
    | RecordType.DLV
    | RecordType.HIP
    | RecordType.IPSECKEY
    | RecordType.IXFR
    | RecordType.KEY
    | RecordType.KX
    | RecordType.LOC
    | RecordType.NSEC3PARAM
    | RecordType.NULL
    | RecordType.SIG
    | RecordType.TA
    | RecordType.TKEY
    | RecordType.TSIG;
  data: Uint8Array | string;
}

export type Answer =
  | AAnswer
  | AAAAAnswer
  | TxtAnswer
  | SrvAnswer
  | HInfoAnswer
  | CaaAnswer
  | NsAnswer
  | SoaAnswer
  | MxAnswer
  | OptAnswer
  | DnskeyAnswer
  | RrsigAnswer
  | RpAnswer
  | NsecAnswer
  | Nsec3Answer
  | SshfpAnswer
  | DsAnswer
  | NaptrAnswer
  | TlsaAnswer
  | PtrAnswer
  | CnameAnswer
  | DnameAnswer
  | SvcbAnswer
  | HttpsAnswer
  | NullAnswer
  | UnknownAnswer;

const FLUSH_MASK = 1 << 15;

export const answer: Encoder<Answer> = {
  bytes(answer) {
    const byteLength =
      8 + name.bytes(answer.type === RecordType.OPT ? '.' : answer.name);
    switch (answer.type) {
      case RecordType.A:
        return byteLength + answerIPv4.bytes(answer.data);
      case RecordType.NS:
        return byteLength + answerName.bytes(answer.data);
      case RecordType.SOA:
        return byteLength + answerSoa.bytes(answer.data);
      case RecordType.HINFO:
        return byteLength + answerHInfo.bytes(answer.data);
      case RecordType.MX:
        return byteLength + answerMx.bytes(answer.data);
      case RecordType.TXT:
        return byteLength + answerTxt.bytes(answer.data);
      case RecordType.RP:
        return byteLength + answerRp.bytes(answer.data);
      case RecordType.AAAA:
        return byteLength + answerIPv6.bytes(answer.data);
      case RecordType.SRV:
        return byteLength + answerSrv.bytes(answer.data);
      case RecordType.NAPTR:
        return byteLength + answerNaptr.bytes(answer.data);
      case RecordType.OPT:
        return byteLength + answerOpt.bytes(answer.data);
      case RecordType.DS:
        return byteLength + answerDs.bytes(answer.data);
      case RecordType.SSHFP:
        return byteLength + answerSshfp.bytes(answer.data);
      case RecordType.RRSIG:
        return byteLength + answerRrsig.bytes(answer.data);
      case RecordType.NSEC:
        return byteLength + answerNsec.bytes(answer.data);
      case RecordType.DNSKEY:
        return byteLength + answerDnskey.bytes(answer.data);
      case RecordType.NSEC3:
        return byteLength + answerNsec3.bytes(answer.data);
      case RecordType.TLSA:
        return byteLength + answerTlsa.bytes(answer.data);
      case RecordType.SVCB:
      case RecordType.HTTPS:
        return byteLength + answerSvcb.bytes(answer.data);
      case RecordType.CAA:
        return byteLength + answerCaa.bytes(answer.data);
      case RecordType.PTR:
      case RecordType.CNAME:
      case RecordType.DNAME:
        return byteLength + answerName.bytes(answer.data);
      default:
        return byteLength + answerBytes.bytes(answer.data);
    }
  },
  write(view, offset, answer) {
    if (answer.type === RecordType.OPT) {
      offset = name.write(view, offset, '.');
      view.setUint16(offset, answer.type);
      view.setUint16(offset + 2, answer.udpPayloadSize || 4_096);
      view.setUint8(offset + 4, answer.extendedRcode || 0);
      view.setUint8(offset + 5, answer.ednsVersion || 0);
      view.setUint16(offset + 6, answer.flags || 0);
      offset += 8;
      return answerOpt.write(view, offset, answer.data);
    }
    offset = name.write(view, offset, answer.name);
    view.setUint16(offset, answer.type);
    view.setUint16(
      offset + 2,
      (answer.class || 0) | (answer.flush ? FLUSH_MASK : 0)
    );
    view.setUint32(offset + 4, answer.ttl || 0);
    offset += 8;
    switch (answer.type) {
      case RecordType.A:
        return answerIPv4.write(view, offset, answer.data);
      case RecordType.NS:
        return answerName.write(view, offset, answer.data);
      case RecordType.SOA:
        return answerSoa.write(view, offset, answer.data);
      case RecordType.HINFO:
        return answerHInfo.write(view, offset, answer.data);
      case RecordType.MX:
        return answerMx.write(view, offset, answer.data);
      case RecordType.TXT:
        return answerTxt.write(view, offset, answer.data);
      case RecordType.RP:
        return answerRp.write(view, offset, answer.data);
      case RecordType.AAAA:
        return answerIPv6.write(view, offset, answer.data);
      case RecordType.SRV:
        return answerSrv.write(view, offset, answer.data);
      case RecordType.NAPTR:
        return answerNaptr.write(view, offset, answer.data);
      case RecordType.DS:
        return answerDs.write(view, offset, answer.data);
      case RecordType.SSHFP:
        return answerSshfp.write(view, offset, answer.data);
      case RecordType.RRSIG:
        return answerRrsig.write(view, offset, answer.data);
      case RecordType.NSEC:
        return answerNsec.write(view, offset, answer.data);
      case RecordType.DNSKEY:
        return answerDnskey.write(view, offset, answer.data);
      case RecordType.NSEC3:
        return answerNsec3.write(view, offset, answer.data);
      case RecordType.TLSA:
        return answerTlsa.write(view, offset, answer.data);
      case RecordType.SVCB:
      case RecordType.HTTPS:
        return answerSvcb.write(view, offset, answer.data);
      case RecordType.CAA:
        return answerCaa.write(view, offset, answer.data);
      case RecordType.PTR:
      case RecordType.CNAME:
      case RecordType.DNAME:
        return answerName.write(view, offset, answer.data);
      default:
        return answerBytes.write(view, offset, answer.data);
    }
  },
  read(view, position) {
    const _name = name.read(view, position);
    const type = view.getUint16(position.offset);
    if (type === RecordType.OPT) {
      const udpPayloadSize = view.getUint16(position.offset + 2) || 4_096;
      const extendedRcode = view.getUint8(position.offset + 4);
      const ednsVersion = view.getUint8(position.offset + 5);
      const flags = view.getUint16(position.offset + 6);
      advance(position, 8);
      return {
        type,
        udpPayloadSize,
        extendedRcode,
        ednsVersion,
        flags,
        data: answerOpt.read(view, position),
      };
    }
    const _class = view.getUint16(position.offset + 2);
    const ttl = view.getUint32(position.offset + 4);
    advance(position, 8);
    const answer: Answer = {
      name: _name,
      type,
      class: _class & ~FLUSH_MASK,
      flush: !!(_class & FLUSH_MASK),
      ttl,
      data: null as any,
    };
    switch (answer.type) {
      case RecordType.A:
        answer.data = answerIPv4.read(view, position);
        return answer;
      case RecordType.NS:
        answer.data = answerName.read(view, position);
        return answer;
      case RecordType.SOA:
        answer.data = answerSoa.read(view, position);
        return answer;
      case RecordType.HINFO:
        answer.data = answerHInfo.read(view, position);
        return answer;
      case RecordType.MX:
        answer.data = answerMx.read(view, position);
        return answer;
      case RecordType.TXT:
        answer.data = answerTxt.read(view, position);
        return answer;
      case RecordType.RP:
        answer.data = answerRp.read(view, position);
        return answer;
      case RecordType.AAAA:
        answer.data = answerIPv6.read(view, position);
        return answer;
      case RecordType.SRV:
        answer.data = answerSrv.read(view, position);
        return answer;
      case RecordType.NAPTR:
        answer.data = answerNaptr.read(view, position);
        return answer;
      case RecordType.DS:
        answer.data = answerDs.read(view, position);
        return answer;
      case RecordType.SSHFP:
        answer.data = answerSshfp.read(view, position);
        return answer;
      case RecordType.RRSIG:
        answer.data = answerRrsig.read(view, position);
        return answer;
      case RecordType.NSEC:
        answer.data = answerNsec.read(view, position);
        return answer;
      case RecordType.DNSKEY:
        answer.data = answerDnskey.read(view, position);
        return answer;
      case RecordType.NSEC3:
        answer.data = answerNsec3.read(view, position);
        return answer;
      case RecordType.TLSA:
        answer.data = answerTlsa.read(view, position);
        return answer;
      case RecordType.SVCB:
      case RecordType.HTTPS:
        answer.data = answerSvcb.read(view, position);
        return answer;
      case RecordType.CAA:
        answer.data = answerCaa.read(view, position);
        return answer;
      case RecordType.PTR:
      case RecordType.CNAME:
      case RecordType.DNAME:
        answer.data = answerName.read(view, position);
        return answer;
      default:
        answer.data = answerBytes.read(view, position);
        return answer;
    }
  },
};

export const compareAnswers = (a: Answer, b: Answer): number => {
  if (a.type === RecordType.OPT || b.type === RecordType.OPT) {
    return 0;
  }
  const aClass = a.class || RecordClass.IN;
  const bClass = b.class || RecordClass.IN;
  if (aClass !== bClass) {
    return aClass - bClass;
  } else if (a.type !== b.type) {
    return a.type - b.type;
  }
  let encoder: Encoder<unknown>;
  switch (a.type) {
    case RecordType.A:
      encoder = answerIPv4;
      break;
    case RecordType.NS:
      encoder = answerName;
      break;
    case RecordType.SOA:
      encoder = answerSoa;
      break;
    case RecordType.HINFO:
      encoder = answerHInfo;
      break;
    case RecordType.MX:
      encoder = answerMx;
      break;
    case RecordType.TXT:
      encoder = answerTxt;
      break;
    case RecordType.RP:
      encoder = answerRp;
      break;
    case RecordType.AAAA:
      encoder = answerIPv6;
      break;
    case RecordType.SRV:
      encoder = answerSrv;
      break;
    case RecordType.NAPTR:
      encoder = answerNaptr;
      break;
    case RecordType.DS:
      encoder = answerDs;
      break;
    case RecordType.SSHFP:
      encoder = answerSshfp;
      break;
    case RecordType.RRSIG:
      encoder = answerRrsig;
      break;
    case RecordType.NSEC:
      encoder = answerNsec;
      break;
    case RecordType.DNSKEY:
      encoder = answerDnskey;
      break;
    case RecordType.NSEC3:
      encoder = answerNsec3;
      break;
    case RecordType.TLSA:
      encoder = answerTlsa;
      break;
    case RecordType.SVCB:
    case RecordType.HTTPS:
      encoder = answerSvcb;
      break;
    case RecordType.CAA:
      encoder = answerCaa;
      break;
    case RecordType.PTR:
    case RecordType.CNAME:
    case RecordType.DNAME:
      encoder = answerName;
      break;
    default:
      encoder = answerBytes;
  }
  const rdataA = encodeIntoBuffer(encoder, a.data);
  const rdataB = encodeIntoBuffer(encoder, b.data);
  const byteLength =
    rdataA.byteLength < rdataB.byteLength
      ? rdataA.byteLength
      : rdataB.byteLength;
  for (let idx = 2; idx < byteLength; idx++) {
    const diff = rdataA[idx] - rdataB[idx];
    if (diff !== 0) {
      return diff < 0 ? -1 : 1;
    }
  }
  return rdataA.byteLength !== rdataB.byteLength
    ? rdataA.byteLength < rdataB.byteLength
      ? -1
      : 1
    : 0;
};

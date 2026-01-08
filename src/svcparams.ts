import {
  type Encoder,
  withRDLength,
  array,
  textDecoder,
  advance,
  uint16,
  bytes,
  ipv4,
  ipv6,
  string,
} from './encoders';

export const enum SvcParamCode {
  Mandatory = 0,
  Alpn = 1,
  NoDefaultAlpn = 2,
  Port = 3,
  Ipv4Hint = 4,
  EchConfig = 5,
  Ipv6Hint = 6,
  DohPath = 7,
  Odoh = 32769,
}

export interface SvcParams {
  mandatory?: (SvcParamCode | (number & {}))[];
  alpn?: string[];
  'no-default-alpn'?: boolean;
  port?: number;
  ipv4hint?: string[];
  ipv6hint?: string[];
  echconfig?: Uint8Array;
  dohpath?: string;
  odoh?: Uint8Array;
}

const mandatorySvcParam: Encoder<(SvcParamCode | (number & {}))[]> =
  withRDLength(array(uint16));
const alpnSvcParam = withRDLength(array(string));
const portSvcParam = withRDLength(uint16);
const ipv4HintSvcParam = withRDLength(array(ipv4));
const ipv6HintSvcParam = withRDLength(array(ipv6));
const bytesSvcParam = withRDLength(bytes);

export const svcParams: Encoder<SvcParams> = {
  bytes(params) {
    let byteLength = 0;
    if (params.mandatory != null)
      byteLength += mandatorySvcParam.bytes(params.mandatory) + 2;
    if (params.alpn != null) byteLength += alpnSvcParam.bytes(params.alpn) + 2;
    if (params['no-default-alpn']) byteLength += 4;
    if (params.port != null) byteLength += portSvcParam.bytes(params.port) + 2;
    if (params.ipv4hint)
      byteLength += ipv4HintSvcParam.bytes(params.ipv4hint) + 2;
    if (params.ipv6hint)
      byteLength += ipv6HintSvcParam.bytes(params.ipv6hint) + 2;
    if (params.echconfig)
      byteLength += bytesSvcParam.bytes(params.echconfig) + 2;
    if (params.dohpath) byteLength += bytesSvcParam.bytes(params.dohpath) + 2;
    if (params.odoh) byteLength += bytesSvcParam.bytes(params.odoh) + 2;
    return byteLength;
  },
  write(view, offset, params) {
    if (params.mandatory != null) {
      view.setUint16(offset, SvcParamCode.Mandatory);
      offset = mandatorySvcParam.write(view, offset + 2, params.mandatory);
    }
    if (params.alpn != null) {
      view.setUint16(offset, SvcParamCode.Alpn);
      offset = alpnSvcParam.write(view, offset + 2, params.alpn);
    }
    if (params['no-default-alpn']) {
      view.setUint16(offset, SvcParamCode.NoDefaultAlpn);
      view.setUint16(offset + 2, 0);
      offset += 4;
    }
    if (params.port != null) {
      view.setUint16(offset, SvcParamCode.Port);
      offset = portSvcParam.write(view, offset + 2, params.port);
    }
    if (params.ipv4hint) {
      view.setUint16(offset, SvcParamCode.Ipv4Hint);
      offset = ipv4HintSvcParam.write(view, offset + 2, params.ipv4hint);
    }
    if (params.ipv6hint) {
      view.setUint16(offset, SvcParamCode.Ipv6Hint);
      offset = ipv6HintSvcParam.write(view, offset + 2, params.ipv6hint);
    }
    if (params.echconfig) {
      view.setUint16(offset, SvcParamCode.EchConfig);
      offset = bytesSvcParam.write(view, offset + 2, params.echconfig);
    }
    if (params.dohpath) {
      view.setUint16(offset, SvcParamCode.DohPath);
      offset = bytesSvcParam.write(view, offset + 2, params.dohpath);
    }
    if (params.odoh) {
      view.setUint16(offset, SvcParamCode.Odoh);
      offset = bytesSvcParam.write(view, offset + 2, params.odoh);
    }
    return offset;
  },
  read(view, position) {
    const { length, offset } = position;
    const params: SvcParams = {
      mandatory: undefined,
      alpn: undefined,
      'no-default-alpn': false,
      port: undefined,
      ipv4hint: undefined,
      ipv6hint: undefined,
      echconfig: undefined,
      dohpath: undefined,
      odoh: undefined,
    };
    while (position.offset - offset < length) {
      const code = view.getUint16(position.offset) as
        | SvcParamCode
        | (number & {});
      advance(position, 2);
      switch (code) {
        case SvcParamCode.Mandatory:
          params.mandatory = mandatorySvcParam.read(view, position);
          break;
        case SvcParamCode.Alpn:
          params.alpn = alpnSvcParam.read(view, position);
          break;
        case SvcParamCode.NoDefaultAlpn:
          params['no-default-alpn'] = true;
          advance(position, 2);
          break;
        case SvcParamCode.Port:
          params.port = portSvcParam.read(view, position);
          break;
        case SvcParamCode.Ipv4Hint:
          params.ipv4hint = ipv4HintSvcParam.read(view, position);
          break;
        case SvcParamCode.Ipv6Hint:
          params.ipv6hint = ipv6HintSvcParam.read(view, position);
          break;
        case SvcParamCode.EchConfig:
          params.echconfig = bytesSvcParam.read(view, position);
          break;
        case SvcParamCode.DohPath:
          params.dohpath = textDecoder.decode(
            bytesSvcParam.read(view, position)
          );
          break;
        case SvcParamCode.Odoh:
          params.odoh = bytesSvcParam.read(view, position);
          break;
        default:
          // NOTE: We discard other parameters using the required RDLENGTH field
          bytesSvcParam.read(view, position);
      }
    }
    return params;
  },
};

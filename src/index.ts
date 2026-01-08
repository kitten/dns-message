import { type Packet, packet } from './packets';

export type {
  NsAnswer,
  AAnswer,
  AAAAAnswer,
  TxtAnswer,
  SrvAnswer,
  HInfoAnswer,
  CaaAnswer,
  SoaAnswer,
  MxAnswer,
  DnskeyAnswer,
  RrsigAnswer,
  RpAnswer,
  NsecAnswer,
  Nsec3Answer,
  SshfpAnswer,
  DsAnswer,
  NaptrAnswer,
  TlsaAnswer,
  PtrAnswer,
  CnameAnswer,
  DnameAnswer,
  NullAnswer,
  UnknownAnswer,
  Answer,
} from './answers';

export type {
  IPType,
  ClientSubnetOpt,
  KeepAliveOpt,
  PaddingOpt,
  TagOpt,
  UnknownOpt,
  PacketOpt,
} from './options';
export type { Packet } from './packets';
export type { Question } from './questions';
export * from './constants';

export function decode(bytes: ArrayBufferView | ArrayBufferLike): Packet {
  const view =
    'buffer' in bytes
      ? new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
      : new DataView(bytes);
  return packet.read(view, { offset: 0, length: view.byteLength });
}

export function streamDecode(bytes: ArrayBufferView | ArrayBufferLike): Packet {
  const view =
    'buffer' in bytes
      ? new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
      : new DataView(bytes);
  const length = Math.min(view.byteLength - 2, view.getUint16(0));
  return packet.read(view, { offset: 2, length });
}

export function encodingLength(input: Packet): number {
  return packet.bytes(input);
}

export function encode(input: Packet): Uint8Array {
  const buffer = new ArrayBuffer(packet.bytes(input));
  const length = packet.write(new DataView(buffer), 0, input);
  return new Uint8Array(buffer, 0, length);
}

export function streamEncode(input: Packet): Uint8Array {
  const buffer = new ArrayBuffer(packet.bytes(input) + 2);
  const view = new DataView(buffer);
  const length = packet.write(view, 2, input);
  view.setUint16(0, length - 2);
  return new Uint8Array(buffer, 0, length);
}

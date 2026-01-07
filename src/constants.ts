export const enum PacketType {
  QUERY = 0,
  RESPONSE = 1 << 15,
}

export const enum RecordType {
  A = 1,
  NS = 2,
  CNAME = 5,
  SOA = 6,
  NULL = 10,
  PTR = 12,
  HINFO = 13,
  MX = 15,
  TXT = 16,
  RP = 17,
  AFSDB = 18,
  SIG = 24,
  KEY = 25,
  AAAA = 28,
  LOC = 29,
  SRV = 33,
  NAPTR = 35,
  KX = 36,
  CERT = 37,
  DNAME = 39,
  OPT = 41,
  APL = 42,
  DS = 43,
  SSHFP = 44,
  IPSECKEY = 45,
  RRSIG = 46,
  NSEC = 47,
  DNSKEY = 48,
  DHCID = 49,
  NSEC3 = 50,
  NSEC3PARAM = 51,
  TLSA = 52,
  HIP = 55,
  CDS = 59,
  CDNSKEY = 60,
  SVCB = 64,
  HTTPS = 65,
  SPF = 99,
  TKEY = 249,
  TSIG = 250,
  IXFR = 251,
  AXFR = 252,
  ANY = 255,
  CAA = 257,
  TA = 32768,
  DLV = 32769,
}

export const enum RecordClass {
  IN = 1,
  CS = 2,
  CH = 3,
  HS = 4,
  ANY = 255,
}

export const enum PacketFlag {
  NOERR = 0,
  FORMERR = 1,
  SERVFAIL = 2,
  NXDOMAIN = 3,
  NOTIMP = 4,
  REFUSED = 5,
  YXDOMAIN = 6,
  YXRRSET = 7,
  NXRRSET = 8,
  NOTAUTH = 9,
  NOTZONE = 10,

  CHECKING_DISABLED = 1 << 4,
  AUTHENTIC_DATA = 1 << 5,
  RECURSION_AVAILABLE = 1 << 7,
  RECURSION_DESIRED = 1 << 8,
  TRUNCATED_RESPONSE = 1 << 9,
  AUTHORITATIVE_ANSWER = 1 << 10,
}

export type PacketRType =
  | PacketFlag.NOERR
  | PacketFlag.FORMERR
  | PacketFlag.SERVFAIL
  | PacketFlag.NXDOMAIN
  | PacketFlag.NOTIMP
  | PacketFlag.REFUSED
  | PacketFlag.YXDOMAIN
  | PacketFlag.YXRRSET
  | PacketFlag.NXRRSET
  | PacketFlag.NOTAUTH
  | PacketFlag.NOTZONE;

export const enum OptCode {
  OPTION_0 = 0,
  LLQ = 1,
  UL = 2,
  NSID = 3,
  OPTION_4 = 4,
  DAU = 5,
  DHU = 6,
  N3U = 7,
  CLIENT_SUBNET = 8,
  EXPIRE = 9,
  COOKIE = 10,
  TCP_KEEPALIVE = 11,
  PADDING = 12,
  CHAIN = 13,
  KEY_TAG = 14,
  DEVICEID = 26946,
  OPTION_65535 = 65535,
}

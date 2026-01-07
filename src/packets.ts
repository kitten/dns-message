import { type PacketFlag, PacketRType, PacketType } from './constants';
import { type Encoder, type ReadPosition, advance } from './encoders';
import { type Question, question } from './questions';
import { type Answer, answer } from './answers';

const readList = <T>(
  encoder: Encoder<T>,
  view: DataView,
  position: ReadPosition,
  limit: number
): T[] | undefined => {
  if (!limit) {
    return undefined;
  }
  const { offset, length } = position;
  const data: T[] = [];
  for (let idx = 0; idx < limit && position.offset - offset < length; idx++)
    data.push(encoder.read(view, position));
  return data;
};

export interface Packet {
  id?: number;
  type?: PacketType;
  rtype?: PacketRType;
  flags?: PacketFlag | (number & {});
  questions?: Question[];
  answers?: Answer[];
  additionals?: Answer[];
  authorities?: Answer[];
}

const PACKET_FLAG_MASK = 32767;

export const packet: Encoder<Packet> = {
  bytes(packet) {
    const { questions, answers, authorities, additionals } = packet;
    let byteLength = 12;
    let idx = 0;
    for (idx = 0; questions && idx < questions.length; idx++)
      byteLength += question.bytes(questions[idx]);
    for (idx = 0; answers && idx < answers.length; idx++)
      byteLength += answer.bytes(answers[idx]);
    for (idx = 0; authorities && idx < authorities.length; idx++)
      byteLength += answer.bytes(authorities[idx]);
    for (idx = 0; additionals && idx < additionals.length; idx++)
      byteLength += answer.bytes(additionals[idx]);
    return byteLength;
  },
  write(view, offset, packet) {
    const { questions, answers, authorities, additionals } = packet;
    let flags =
      ((packet.flags || 0) & PACKET_FLAG_MASK) |
      (packet.type || PacketType.QUERY) |
      (packet.rtype || 0);
    view.setUint16(offset, packet.id || 0);
    view.setUint16(offset + 2, flags);
    view.setUint16(offset + 4, packet.questions?.length || 0);
    view.setUint16(offset + 6, packet.answers?.length || 0);
    view.setUint16(offset + 8, packet.authorities?.length || 0);
    view.setUint16(offset + 10, packet.additionals?.length || 0);
    offset += 12;
    let idx = 0;
    for (idx = 0; questions && idx < questions.length; idx++)
      offset = question.write(view, offset, questions[idx]);
    for (idx = 0; answers && idx < answers.length; idx++)
      offset = answer.write(view, offset, answers[idx]);
    for (idx = 0; authorities && idx < authorities.length; idx++)
      offset = answer.write(view, offset, authorities[idx]);
    for (idx = 0; additionals && idx < additionals.length; idx++)
      offset = answer.write(view, offset, additionals[idx]);
    return offset;
  },
  read(view, position) {
    const id = view.getUint16(position.offset);
    const flags = view.getUint16(position.offset + 2);
    const questionsLength = view.getUint16(position.offset + 4);
    const answersLength = view.getUint16(position.offset + 6);
    const authoritiesLength = view.getUint16(position.offset + 8);
    const additionalsLength = view.getUint16(position.offset + 10);
    advance(position, 12);
    return {
      id,
      flags,
      rtype: flags & 0xf,
      type:
        flags & PacketType.RESPONSE ? PacketType.RESPONSE : PacketType.QUERY,
      questions: readList(question, view, position, questionsLength),
      answers: readList(answer, view, position, answersLength),
      authorities: readList(answer, view, position, authoritiesLength),
      additionals: readList(answer, view, position, additionalsLength),
    };
  },
};

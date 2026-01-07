import { RecordClass, RecordType } from './constants';
import { Encoder, name, advance } from './encoders';

export interface Question {
  name: string;
  type: RecordType;
  class?: RecordClass;
  qu?: boolean;
}

const QU_BIT = 1 << 15;

export const question: Encoder<Question> = {
  bytes(question) {
    return name.bytes(question.name) + 4;
  },
  write(view, offset, question) {
    let _class = question.class || RecordClass.IN;
    if (question.qu) _class |= QU_BIT;
    offset = name.write(view, offset, question.name);
    view.setUint16(offset, question.type);
    view.setUint16(offset + 2, _class);
    offset += 4;
    return offset;
  },
  read(view, position) {
    const _name = name.read(view, position);
    const type = view.getUint16(position.offset);
    let _class = view.getUint16(position.offset + 2) || RecordClass.ANY;
    let qu = false;
    if (_class !== RecordClass.ANY && _class & QU_BIT) {
      _class &= ~QU_BIT;
      qu = true;
    }
    advance(position, 4);
    return {
      name: _name,
      type,
      class: _class,
      qu,
    };
  },
};

import { describe, it, expect } from 'vitest';
import { parseIdCard, IdCardError } from '../src/lib/idCard';

/**
 * 身份证严格校验测试
 *
 * 校验位算法(GB 11643-1999):
 *   权重 W = [7,9,10,5,8,4,2,1,6,3,7,9,10,5,8,4,2]
 *   校验码表 = ['1','0','X','9','8','7','6','5','4','3','2']  (按 sum mod 11 取)
 */
describe('parseIdCard', () => {
  describe('合法身份证', () => {
    it('正确解析男职工(奇数第17位)的出生日期与性别', () => {
      // 110101 19850101 123 4 —— 先构造,校验位由算法保证
      const id = makeValidId('110101', '19850101', '123');
      const info = parseIdCard(id);
      expect(info.birthDate).toBe('1985-01-01');
      expect(info.gender).toBe('male'); // 第17位=3(奇数)
    });

    it('正确解析女职工(偶数第17位)的出生日期与性别', () => {
      const id = makeValidId('110101', '19900315', '242');
      const info = parseIdCard(id);
      expect(info.birthDate).toBe('1990-03-15');
      expect(info.gender).toBe('female'); // 第17位=4(偶数)
    });

    it('末位 X 作为合法校验码时通过校验', () => {
      // 选取 addr=110101, birth=19900101, seq=100:
      //   sum = (前14位加权和 104) + 1*8 = 112, 112 % 11 = 2 → 校验码查表为 'X'
      const xId = makeValidId('110101', '19900101', '100');
      expect(xId[17]).toBe('X');
      const info = parseIdCard(xId);
      expect(info.birthDate).toBe('1990-01-01');
      expect(info.gender).toBe('female'); // 第17位=0(偶数)
    });

    it('解析时保留原始输入', () => {
      const id = makeValidId('110101', '19850101', '123');
      expect(parseIdCard(id).raw).toBe(id);
    });
  });

  describe('长度与格式校验', () => {
    it('17位号码 → INVALID_LENGTH', () => {
      expect(() => parseIdCard('11010119850101123')).toThrow(IdCardError);
      try {
        parseIdCard('11010119850101123');
      } catch (e) {
        expect((e as IdCardError).code).toBe('INVALID_LENGTH');
      }
    });

    it('19位号码 → INVALID_LENGTH', () => {
      expect(() => parseIdCard('1101011985010112345')).toThrow(IdCardError);
    });

    it('含字母(非末位X)→ INVALID_FORMAT', () => {
      expect(() => parseIdCard('11010119850101A234')).toThrow(IdCardError);
      try {
        parseIdCard('11010119850101A234');
      } catch (e) {
        expect((e as IdCardError).code).toBe('INVALID_FORMAT');
      }
    });

    it('空字符串 → INVALID_LENGTH', () => {
      expect(() => parseIdCard('')).toThrow(IdCardError);
    });
  });

  describe('出生日期校验', () => {
    it('非法月份(13月)→ INVALID_BIRTHDATE', () => {
      const id = makeValidId('110101', '19851301', '123'); // 13月
      expect(() => parseIdCard(id)).toThrow(IdCardError);
      try {
        parseIdCard(id);
      } catch (e) {
        expect((e as IdCardError).code).toBe('INVALID_BIRTHDATE');
      }
    });

    it('非法日期(2月30日)→ INVALID_BIRTHDATE', () => {
      const id = makeValidId('110101', '19850230', '123');
      expect(() => parseIdCard(id)).toThrow(IdCardError);
    });

    it('平年2月29日 → INVALID_BIRTHDATE', () => {
      // 1985 是平年
      const id = makeValidId('110101', '19850229', '123');
      expect(() => parseIdCard(id)).toThrow(IdCardError);
    });

    it('闰年2月29日合法(2000年)', () => {
      const id = makeValidId('110101', '20000229', '123');
      expect(parseIdCard(id).birthDate).toBe('2000-02-29');
    });

    it('出生日期在未来 → UNDER_AGE', () => {
      const id = makeValidId('110101', '20990101', '123');
      expect(() => parseIdCard(id)).toThrow(IdCardError);
      try {
        parseIdCard(id);
      } catch (e) {
        expect((e as IdCardError).code).toBe('UNDER_AGE');
      }
    });
  });

  describe('校验位校验', () => {
    it('错误的校验位 → INVALID_CHECKSUM', () => {
      // 取一个合法号,把最后一位改错(且不能恰好改成另一个合法校验位)
      const valid = makeValidId('110101', '19850101', '123');
      const wrong = valid.slice(0, 17) + (valid[17] === '0' ? '1' : '0');
      expect(() => parseIdCard(wrong)).toThrow(IdCardError);
      try {
        parseIdCard(wrong);
      } catch (e) {
        expect((e as IdCardError).code).toBe('INVALID_CHECKSUM');
      }
    });
  });
});

/**
 * 辅助:给定前6位地址码、8位出生日期、3位顺序码,计算合法校验位拼成18位号码。
 * 测试夹具专用,确保测试用例的号码始终合法。
 */
function makeValidId(addr: string, birth: string, seq: string): string {
  const WEIGHTS = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const CHECK_MAP = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];
  const front17 = addr + birth + seq;
  if (front17.length !== 17) {
    throw new Error(`makeValidId 夹具错误: 前17位长度=${front17.length}`);
  }
  const sum = front17
    .split('')
    .reduce((acc, ch, i) => acc + Number(ch) * WEIGHTS[i], 0);
  return front17 + CHECK_MAP[sum % 11];
}

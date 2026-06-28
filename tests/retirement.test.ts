import { describe, it, expect } from 'vitest';
import { computeRetirement, computeByGender, POLICY_START } from '../src/lib/retirement';

/**
 * 退休时间计算算法测试。
 *
 * 政策(2025-01-01 起,15年过渡期):
 *   男职工   60 → 63,每4个月延迟1月
 *   女干部   55 → 58,每4个月延迟1月
 *   女工人   50 → 55,每2个月延迟1月
 *
 * 预期值依据人社部对照表逻辑手工核算,作为算法的"金标准"。
 */

describe('computeRetirement —— 男职工(60→63,每4月延迟1月)', () => {
  const male = { baseAge: 60, stepMonths: 4, finalAge: 63, category: '男职工(原60周岁)' };

  it('政策前已到龄 → 不延迟', () => {
    // 出生 1964-12-01:原退休 2024-12-01(政策前)→ 延迟0
    const r = computeRetirement('1964-12-01', male);
    expect(r.delayMonths).toBe(0);
    expect(r.actualRetireDate).toBe('2024-12-01');
    expect(r.originalRetireDate).toBe('2024-12-01');
    expect(r.actualRetireAge).toEqual({ years: 60, months: 0 });
  });

  it('原退休日恰在政策首月(2025-01)→ 延迟1月', () => {
    // 出生 1965-01-01:原退休 2025-01-01 → 第1档 → 延迟1月 → 2025-02-01
    const r = computeRetirement('1965-01-01', male);
    expect(r.delayMonths).toBe(1);
    expect(r.actualRetireDate).toBe('2025-02-01');
    expect(r.actualRetireAge).toEqual({ years: 60, months: 1 });
  });

  it('原退休日 2025-04 → 第1档 → 延迟1月', () => {
    // 出生 1965-04-01:原退休 2025-04-01,monthsAfter=3,tier=floor(3/4)+1=1 → 延迟1月
    const r = computeRetirement('1965-04-01', male);
    expect(r.delayMonths).toBe(1);
    expect(r.actualRetireDate).toBe('2025-05-01');
  });

  it('原退休日 2025-05 → 第2档 → 延迟2月', () => {
    // 出生 1965-05-01:原退休 2025-05-01,monthsAfter=4,tier=floor(4/4)+1=2 → 延迟2月
    const r = computeRetirement('1965-05-01', male);
    expect(r.delayMonths).toBe(2);
    expect(r.actualRetireDate).toBe('2025-07-01');
    expect(r.actualRetireAge).toEqual({ years: 60, months: 2 });
  });

  it('原退休日 2025-09 → 第3档 → 延迟3月', () => {
    // 出生 1965-09-01:原退休 2025-09-01,monthsAfter=8,tier=3 → 延迟3月
    const r = computeRetirement('1965-09-01', male);
    expect(r.delayMonths).toBe(3);
    expect(r.actualRetireDate).toBe('2025-12-01');
  });

  it('封顶:出生 1976-09-01 → 延迟达36月,封顶63岁', () => {
    // 出生 1976-09-01:原退休 2036-09-01,monthsAfter=140,tier=36 → 延迟36月 → 2039-09
    // 但 36月已达上限(60→63 差36月),封顶到出生+63岁 = 2039-09-01
    const r = computeRetirement('1976-09-01', male);
    expect(r.delayMonths).toBe(36);
    expect(r.actualRetireDate).toBe('2039-09-01');
    expect(r.actualRetireAge).toEqual({ years: 63, months: 0 });
  });

  it('封顶后:出生 1985-01-01 → 直接63岁', () => {
    // 已远超过渡期,封顶63岁
    const r = computeRetirement('1985-01-01', male);
    expect(r.delayMonths).toBe(36);
    expect(r.actualRetireDate).toBe('2048-01-01');
    expect(r.actualRetireAge).toEqual({ years: 63, months: 0 });
  });
});

describe('computeRetirement —— 女干部(55→58,每4月延迟1月)', () => {
  const cadre = { baseAge: 55, stepMonths: 4, finalAge: 58, category: '女干部(原55周岁)' };

  it('政策首月 → 延迟1月', () => {
    // 出生 1970-01-01:原退休 2025-01-01 → 延迟1月 → 2025-02-01
    const r = computeRetirement('1970-01-01', cadre);
    expect(r.delayMonths).toBe(1);
    expect(r.actualRetireDate).toBe('2025-02-01');
  });

  it('封顶:出生 1981-09-01 → 58岁', () => {
    const r = computeRetirement('1981-09-01', cadre);
    expect(r.delayMonths).toBe(36);
    expect(r.actualRetireDate).toBe('2039-09-01');
    expect(r.actualRetireAge).toEqual({ years: 58, months: 0 });
  });
});

describe('computeRetirement —— 女工人(50→55,每2月延迟1月)', () => {
  const worker = { baseAge: 50, stepMonths: 2, finalAge: 55, category: '女工人(原50周岁)' };

  it('政策首月 → 延迟1月', () => {
    // 出生 1975-01-01:原退休 2025-01-01 → 第1档 → 延迟1月
    const r = computeRetirement('1975-01-01', worker);
    expect(r.delayMonths).toBe(1);
    expect(r.actualRetireDate).toBe('2025-02-01');
  });

  it('原退休日 2025-02 → 仍第1档(每2月一档)→ 延迟1月', () => {
    // 出生 1975-02-01:原退休 2025-02-01,monthsAfter=1,tier=floor(1/2)+1=1 → 延迟1月
    const r = computeRetirement('1975-02-01', worker);
    expect(r.delayMonths).toBe(1);
    expect(r.actualRetireDate).toBe('2025-03-01');
  });

  it('原退休日 2025-03 → 第2档 → 延迟2月', () => {
    // 出生 1975-03-01:原退休 2025-03-01,monthsAfter=2,tier=floor(2/2)+1=2 → 延迟2月
    const r = computeRetirement('1975-03-01', worker);
    expect(r.delayMonths).toBe(2);
    expect(r.actualRetireDate).toBe('2025-05-01');
  });

  it('封顶:出生 1980-01-01 → 未达封顶,延迟31月', () => {
    // 出生1980-01:原退休2030-01,monthsAfter=60,每2月一档 → tier=31 → 延迟31月
    // 实际退休 = 1980-01 + (600+31)月 = 2032-08;封顶线55岁=2035-01,未触及
    const r = computeRetirement('1980-01-01', worker);
    expect(r.delayMonths).toBe(31);
    expect(r.actualRetireDate).toBe('2032-08-01');
    expect(r.actualRetireAge).toEqual({ years: 52, months: 7 });
  });

  it('真正封顶:出生 1989-01-01 → 55岁', () => {
    // 出生1989-01:原退休2039-01,monthsAfter=168,tier=85 → delay=85月
    // 未封顶实际退休 = 1989-01 + (600+85)月 = 2041-02;
    // 封顶线 = 1989+55 = 2044-01,2041-02 < 2044-01 仍未触顶? 复核...
    // 用足够晚的出生确保封顶:1990-01 原退休2040-01,tier=floor(180/2)+1=91,delay=91
    // 实际=1990-01+(600+91)月=2041-04,封顶2045-01仍未触顶
    // 结论:女工人50→55,每2月延迟1月,理论需(55-50)*12=60月延迟,
    //       达到60月延迟需要 tier=60,即 monthsAfter>=118,即原退休月在 2034-11 之后
    // 出生1985-01:原退休2035-01,monthsAfter=120,tier=61 → delay=61 → 封顶到60月
    const r = computeRetirement('1985-01-01', worker);
    expect(r.delayMonths).toBe(60);
    expect(r.actualRetireDate).toBe('2040-01-01');
    expect(r.actualRetireAge).toEqual({ years: 55, months: 0 });
  });
});

describe('computeByGender —— 按性别聚合(女性双算)', () => {
  it('男性 → 只返回男职工一项(cadre 参数对男性无效)', () => {
    const results = computeByGender('male', '1965-01-01');
    expect(results).toHaveLength(1);
    expect(results[0].category).toContain('男职工');

    // 即便传了 cadre=true,男性仍是男职工
    const resultsCadre = computeByGender('male', '1965-01-01', true);
    expect(resultsCadre).toHaveLength(1);
    expect(resultsCadre[0].category).toContain('男职工');
  });

  it('女性 + 不传 cadre(默认)→ 女工人', () => {
    const results = computeByGender('female', '1985-01-01');
    expect(results).toHaveLength(1);
    expect(results[0].category).toBe('女工人(原50周岁)');
  });

  it('女性 + cadre=false → 女工人', () => {
    const results = computeByGender('female', '1985-01-01', false);
    expect(results).toHaveLength(1);
    expect(results[0].category).toBe('女工人(原50周岁)');
  });

  it('女性 + cadre=true → 女干部', () => {
    const results = computeByGender('female', '1985-01-01', true);
    expect(results).toHaveLength(1);
    expect(results[0].category).toBe('女干部(原55周岁)');
  });

  it('女工人退休应早于女干部(同一人)', () => {
    const worker = computeByGender('female', '1985-01-01', false)[0];
    const cadre = computeByGender('female', '1985-01-01', true)[0];
    expect(worker.actualRetireDate < cadre.actualRetireDate).toBe(true);
  });
});

describe('POLICY_START 常量', () => {
  it('政策起始日为 2025-01-01', () => {
    expect(POLICY_START).toBe('2025-01-01');
  });
});

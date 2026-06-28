import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { retirementQuerySchema, retirementCalculateSchema } from '../schemas.js';
import { parseIdCard, IdCardError } from '../lib/idCard.js';
import { computeByGender } from '../lib/retirement.js';

export const retirement = new Hono();

/**
 * GET /retirement?idCard=<18位身份证号>[&cadre=1]
 *
 * 返回该身份证对应人员的法定退休时间。
 * 男性:男职工(60→63);
 * 女性:cadre=1 当女干部(55→58),不传或 cadre=0 当女工人(50→55)。
 */
retirement.get('/', zValidator('query', retirementQuerySchema, (result, c) => {
  if (!result.success) {
    return c.json(
      {
        ok: false,
        error: { code: 'INVALID_REQUEST', message: result.error.issues[0]?.message ?? '参数错误' },
      },
      400,
    );
  }
}), (c) => {
  const { idCard, cadre } = c.req.valid('query');

  let info;
  try {
    info = parseIdCard(idCard);
  } catch (e) {
    if (e instanceof IdCardError) {
      return c.json({ ok: false, error: { code: e.code, message: e.message } }, 400);
    }
    throw e;
  }

  const results = computeByGender(info.gender, info.birthDate, cadre);

  return c.json({
    ok: true,
    data: {
      idCard: info.raw,
      gender: info.gender === 'male' ? '男' : '女',
      birthDate: info.birthDate,
      results,
    },
  });
});

/**
 * GET /retirement/calculate?birthDate=YYYY-MM&gender=male|female[&cadre=0|1]
 *
 * 直接根据出生年月和性别计算退休时间(无需身份证号)。
 * 女性:cadre=1 当女干部(55→58),不传或 cadre=0 当女工人(50→55)。
 */
retirement.get('/calculate', zValidator('query', retirementCalculateSchema, (result, c) => {
  if (!result.success) {
    return c.json(
      {
        ok: false,
        error: { code: 'INVALID_REQUEST', message: result.error.issues[0]?.message ?? '参数错误' },
      },
      400,
    );
  }
}), (c) => {
  const { birthDate, gender, cadre } = c.req.valid('query');

  const results = computeByGender(gender, `${birthDate}-01`, cadre);

  return c.json({
    ok: true,
    data: {
      gender: gender === 'male' ? '男' : '女',
      birthDate,
      results,
    },
  });
});

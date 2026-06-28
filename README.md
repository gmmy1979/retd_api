# 退休时间计算 API (retirement-api)

通过身份证号计算**实际法定退休时间**的轻量 HTTP 服务,依据《全国人大常委会关于实施渐进式延迟法定退休年龄的决定》(2025年1月1日起施行)。

## 政策依据

自 **2025-01-01** 起,用 15 年过渡期逐步延迟法定退休年龄:

| 职工类别 | 原退休年龄 | 延迟节奏 | 最终退休年龄 |
|---------|----------|---------|------------|
| 男职工 | 60 周岁 | 每 4 个月延迟 1 个月 | 63 周岁 |
| 女干部(原 55 岁) | 55 周岁 | 每 4 个月延迟 1 个月 | 58 周岁 |
| 女工人(原 50 岁) | 50 周岁 | 每 2 个月延迟 1 个月 | 55 周岁 |

> 2025-01-01 前已达原法定退休年龄者不受影响;过渡期结束后(约 2040 年)统一达到最终年龄。

## 快速开始

```bash
npm install
npm run dev      # 开发模式(热重载),默认端口 3000
# 或
npm start        # 普通启动
```

环境变量:
- `PORT` —— 监听端口(默认 3000)

## API

### `GET /retirement?idCard=<18位身份证号>[&cadre=0|1]`

身份证解析出**性别**与**出生日期**后计算:
- 男性 → 男职工(60→63),`cadre` 参数无效
- 女性 → 由 `cadre` 决定:`cadre=1` 为女干部(55→58),不传或 `cadre=0` 为女工人(50→55)

#### 成功响应(男性)

```json
{
  "ok": true,
  "data": {
    "idCard": "110101196501011213",
    "gender": "男",
    "birthDate": "1965-01-01",
    "results": [
      {
        "category": "男职工(原60周岁)",
        "originalRetireAge": 60,
        "originalRetireDate": "2025-01-01",
        "actualRetireDate": "2025-02-01",
        "actualRetireAge": { "years": 60, "months": 1 },
        "delayMonths": 1
      }
    ]
  }
}
```

#### 成功响应(女性,默认女工人)

```json
{
  "ok": true,
  "data": {
    "idCard": "110101198501012426",
    "gender": "女",
    "birthDate": "1985-01-01",
    "results": [
      {
        "category": "女工人(原50周岁)",
        "originalRetireAge": 50,
        "originalRetireDate": "2035-01-01",
        "actualRetireDate": "2040-01-01",
        "actualRetireAge": { "years": 55, "months": 0 },
        "delayMonths": 60
      }
    ]
  }
}
```

传 `&cadre=1` 时,`results[0]` 则为女干部结果(`category: "女干部(原55周岁)"`)。

```

#### 字段说明

| 字段 | 含义 |
|------|------|
| `originalRetireAge` / `originalRetireDate` | 按旧政策(改革前)的退休年龄与日期 |
| `actualRetireDate` | 实际退休日(已含延迟,且已封顶至最终年龄) |
| `actualRetireAge` | 实际退休时的年龄(年 + 月) |
| `delayMonths` | 相对原退休年龄延迟的月数 |

### 错误响应

```json
{ "ok": false, "error": { "code": "INVALID_CHECKSUM", "message": "身份证校验位错误" } }
```

错误码:

| code | 含义 |
|------|------|
| `INVALID_REQUEST` | 请求参数缺失或基本格式不符(长度/字符) |
| `INVALID_LENGTH` | 身份证号长度不是 18 位 |
| `INVALID_FORMAT` | 前 17 位非数字,或末位非数字/X |
| `INVALID_BIRTHDATE` | 出生日期不存在(如 2 月 30 日、平年 2 月 29 日) |
| `INVALID_CHECKSUM` | 校验位(GB 11643-1999)校验失败 |
| `UNDER_AGE` | 出生日期在未来 |

## 身份证校验

采用国标 **GB 11643-1999** 18 位身份证严格校验:

1. 长度 18 位,前 17 位为数字,末位为数字或 `X`
2. 第 7-14 位为合法公历日期(含闰年判断)
3. 第 17 位决定性别(奇数=男,偶数=女)
4. 校验位:权重 `[7,9,10,5,8,4,2,1,6,3,7,9,10,5,8,4,2]`,加权和 mod 11 查表 `[1,0,X,9,8,7,6,5,4,3,2]`
5. 出生日期不得在未来

> 仅支持 18 位新身份证,不支持 15 位老证。

## 项目结构

```
retirement-api/
├── src/
│   ├── index.ts            # Hono 入口
│   ├── routes/retirement.ts
│   ├── lib/
│   │   ├── idCard.ts       # 身份证严格校验与解析
│   │   ├── retirement.ts   # ★退休计算核心算法(纯函数)
│   │   └── types.ts
│   └── schemas.ts          # Zod 请求 schema
└── tests/
    ├── idCard.test.ts      # 14 个用例
    └── retirement.test.ts  # 17 个用例(含边界与封顶)
```

## 测试

```bash
npm test           # 跑全部
npm run test:watch # 监听模式
```

测试覆盖核心算法的所有边界:政策前到龄(0 延迟)、各档延迟、封顶、女性双算、闰年日期、校验位等。

## 已知限制(本版 YAGNI)

- 不支持 15 位老身份证
- 不计算养老金领取资格(缴费年限另算)
- 无身份认证(工具型 API,部署时按需在反向代理层加)
- 无数据存储(纯计算服务)

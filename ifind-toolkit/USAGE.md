# iFinD 行情数据用户级工具

## 定位

用户级共享的同花顺 iFinD **行情数据**封装。

**分工**：
- **行情/基本面（结构化数据）→ 本工具**（iFinD SDK 直连，零 NLP 误差）
- **新闻/舆情（全文素材）→ MCP `search_news` / `search_trending_news`**（iFinD SDK 不擅长新闻全文检索）

**不要使用** MCP 的 `mcp__hexin-ifind-ds-stock-mcp__get_stock_performance`（NLP 层 bug 多，已实测不稳定）。

## 目录结构

```
C:\Users\53271\.ifind\
    credentials.json      # 账号密码（勿 commit）
    ifind_helper.py       # 封装入口
    README.md             # 本文件
```

## 快速使用

```python
import sys, os
sys.path.insert(0, os.path.expanduser('~/.ifind'))
from ifind_helper import quotes_as_dict

# 一次拿多个代码，默认返回 9 字段（preClose/open/high/low/close/change/changeRatio/volume/amount）
d = quotes_as_dict(
    ['000001.SH', '399001.SZ', '980017.SZ'],
    '2026-04-21'
)
# {'000001.SH': {'preClose': ..., 'open': ..., 'high': ..., 'low': ...,
#                'close': ..., 'change': ..., 'changeRatio': ...,
#                'volume': ..., 'amount': ...}, ...}
```

> ⚠️ **默认使用 9 字段而非 4 字段的原因**（2026-05-19 国证芯片结算时延 bug 修复）：
> 当 fields 只包含 `preClose,close,change,changeRatio` 时，iFinD 对**国证系指数**（980017、980018 等）在收盘后 15:00-16:00 窗口可能返回**未结算的初步快照**，与最终收盘价相差 0.01%-0.1%。
> 把 OHLC/volume/amount 一起请求，会触发完整结算查询路径，直接返回最终值。
> 沪深交易所自有指数（000001.SH/399001.SZ/399006.SZ）和 ETF 不受影响。

### 命令行一把查

```powershell
& "D:\anaconda3\python.exe" -c "import sys, os; sys.path.insert(0, os.path.expanduser('~/.ifind')); from ifind_helper import quotes_as_dict; import json; print(json.dumps(quotes_as_dict(['000001.SH','399001.SZ','399006.SZ','980017.SZ'], '2026-04-21'), ensure_ascii=False, indent=2))"
```

## 常用代码清单

| 代码 | 名称 |
|---|---|
| 000001.SH | 上证指数 |
| 399001.SZ | 深证成指 |
| 399006.SZ | 创业板指 |
| 980017.SZ | 国证芯片 |
| 000300.SH | 沪深300 |
| 159732.SZ | 消费电子 ETF（华夏） |
| 159516.SZ | 半导体设备 ETF（国泰） |
| 512760.SH | 芯片 ETF（国泰） |
| 159813.SZ | 半导体 ETF（鹏华） |

## 常用字段

`preClose, open, high, low, close, avgPrice, change, changeRatio, volume, turnoverRatio, amount, transactionAmount`

## 前置条件

1. **SDK 已安装**：`THSDataInterface_Windows/bin/x64/InstallPython.bat` 已运行
2. **客户端已登录**：`SuperCommand.exe` 保持登录态（不登录时 helper 会用 credentials.json 自动登录）
3. **Python 环境**：`D:\anaconda3\python.exe`（Windows + 64bit，Anaconda site-packages 内已安装 iFinDPy）

## 运行自检

```powershell
& "D:\anaconda3\python.exe" "C:\Users\53271\.ifind\ifind_helper.py"
```

应输出 7 个代码（三大指数 + 国证芯片 + 三只 ETF）的 9 字段。

## 维护

- 账号密码过期：更新 `credentials.json`
- SDK 升级：覆盖 `THSDataInterface_Windows` 目录，必要时重跑 `InstallPython.bat`
- 新增函数：直接加到 `ifind_helper.py`，保持单文件

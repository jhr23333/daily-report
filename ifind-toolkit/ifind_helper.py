# -*- coding: utf-8 -*-
"""
同花顺 iFinD 行情数据封装（用户级共享工具）。

用法：
    import sys, os
    sys.path.insert(0, os.path.expanduser('~/.ifind'))
    from ifind_helper import quotes_as_dict

    d = quotes_as_dict(
        ['000001.SH', '399001.SZ', '399006.SZ', '980017.SZ'],
        '2026-04-21'
    )
    # {'000001.SH': {'preClose': 4082.13, 'close': 4085.08,
    #                'change': 2.95, 'changeRatio': 0.0723}, ...}

登录前置条件：
    1. 已安装 iFinDPy（运行 THSDataInterface_Windows/bin/x64/InstallPython.bat）
    2. SuperCommand.exe 已启动并登录（或本模块会用 credentials.json 自动登录）
"""
import os
import sys
import json

_HERE = os.path.dirname(os.path.abspath(__file__))
_CREDENTIALS_PATH = os.path.join(_HERE, 'credentials.json')
_SDK_BIN_X64 = r'C:\Users\53271\Downloads\THSDataInterface_Windows_20260227\THSDataInterface_Windows\bin\x64'
_logged_in = False


def _load_credentials():
    with open(_CREDENTIALS_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)


def _import_ifindpy():
    """优先直接 import；失败则把 SDK bin/x64 加入 sys.path 再试。"""
    try:
        import iFinDPy  # noqa
        return iFinDPy
    except ImportError:
        pass
    if os.path.isdir(_SDK_BIN_X64) and _SDK_BIN_X64 not in sys.path:
        sys.path.insert(0, _SDK_BIN_X64)
        os.environ['PATH'] = _SDK_BIN_X64 + os.pathsep + os.environ.get('PATH', '')
        try:
            if hasattr(os, 'add_dll_directory'):
                os.add_dll_directory(_SDK_BIN_X64)
        except Exception:
            pass
    try:
        import iFinDPy  # noqa
        return iFinDPy
    except ImportError as e:
        raise RuntimeError(
            "iFinDPy 导入失败。请先运行 "
            r"C:\Users\53271\Downloads\THSDataInterface_Windows_20260227"
            r"\THSDataInterface_Windows\bin\x64\InstallPython.bat。"
            f"原始错误: {e}"
        )


def _ensure_login():
    global _logged_in
    if _logged_in:
        return
    _import_ifindpy()
    from iFinDPy import THS_iFinDLogin
    cred = _load_credentials()
    ret = THS_iFinDLogin(cred['account'], cred['password'])
    if ret not in (0, -201):
        raise RuntimeError(
            f"iFinD 登录失败，错误码 {ret}。"
            "请确认 SuperCommand.exe 已登录，或 credentials.json 账号密码正确。"
        )
    _logged_in = True


def get_quotes(codes, date, fields='preClose,open,high,low,close,change,changeRatio,volume,amount'):
    """
    取指定代码在指定日期的日频行情。
    Args:
        codes: str 或 list，如 '000001.SH' 或 ['000001.SH', '399001.SZ']
        date:  'YYYY-MM-DD' 字符串，起止同一天即取单日
        fields: 以逗号分隔的字段。常用：
                  preClose, open, high, low, close, avgPrice,
                  change, changeRatio, volume, turnoverRatio,
                  amount, transactionAmount
    Returns:
        pandas.DataFrame（列：thscode, time, + 所请求字段）
    """
    _ensure_login()
    from iFinDPy import THS_HistoryQuotes, THS_Trans2DataFrame
    if isinstance(codes, (list, tuple)):
        codes = ','.join(codes)
    data = THS_HistoryQuotes(
        codes, fields,
        'Interval:D,CPS:1,baseDate:1900-01-01,Currency:YSHB,fill:Previous',
        date, date
    )
    return THS_Trans2DataFrame(data)


def quotes_as_dict(codes, date, fields='preClose,open,high,low,close,change,changeRatio,volume,amount'):
    """
    便捷版：返回 {code: {field: value, ...}, ...} 嵌套字典。
    对 LLM 友好，不用再处理 DataFrame 行列。
    """
    df = get_quotes(codes, date, fields)
    if df is None or len(df) == 0:
        return {}
    result = {}
    for _, row in df.iterrows():
        code = row.get('thscode')
        result[code] = {f: row.get(f) for f in fields.split(',')}
    return result


if __name__ == '__main__':
    # 自检：打印当日三大指数 + 国证芯片 + 三只 ETF 的四字段
    import datetime
    today = datetime.date.today().strftime('%Y-%m-%d')
    codes = ['000001.SH', '399001.SZ', '399006.SZ',
             '980017.SZ', '159732.SZ', '159516.SZ', '512760.SH']
    print(f"=== iFinD 自检 @ {today} ===")
    try:
        d = quotes_as_dict(codes, today)
        for c, v in d.items():
            print(f"  {c}: {v}")
        print("OK")
    except Exception as e:
        print(f"FAIL: {e}")
        sys.exit(1)

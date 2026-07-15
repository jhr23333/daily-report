# iFinD 工具安装（实习生必看）

日报的行情取数依赖同花顺 iFinD SDK + 这个 `ifind_helper.py` 封装。
本目录是**工具本体**，你需要把它安装到你自己机器的用户主目录 `~/.ifind/`。

> ⚠️ 本目录**不含** `credentials.json`——那是账号密码，每个人用自己的（见第 3 步）。

## 安装步骤

### 1. 把封装脚本放到 `~/.ifind/`
把本目录的 `ifind_helper.py` 复制到你的用户主目录下的 `.ifind\` 文件夹：

```powershell
# Windows PowerShell（在项目目录里执行）
New-Item -ItemType Directory -Force "$HOME\.ifind" | Out-Null
Copy-Item ".\ifind-toolkit\ifind_helper.py" "$HOME\.ifind\ifind_helper.py"
```

最终应有 `C:\Users\你的用户名\.ifind\ifind_helper.py`。

### 2. 安装 iFinD SDK（THSDataInterface）
`ifind_helper.py` 依赖 iFinD 的 Python SDK（`iFinDPy`）。

- 从同花顺 iFinD 客户端 / 官方渠道下载 **THSDataInterface_Windows** 数据接口包（这一步需要负责人给你 iFinD 客户端的下载/安装权限）。
- 运行其中的 `bin\x64\InstallPython.bat`，把 `iFinDPy` 装进你的 Python（Anaconda）环境。
- 装完后，`import iFinDPy` 能直接用，`ifind_helper.py` 里对 SDK 路径的写死项就不会被触发。

### 3. 填你自己的 iFinD 账号
回到项目根目录运行：

```bash
node setup_ifind.js
```

按提示输入**你自己的** iFinD 账号 / 密码，脚本会写到 `~/.ifind/credentials.json`。
再启动 `SuperCommand.exe` 登录同一账号。

### 4. 自检
```bash
node preflight.js
```
`iFinD 凭证` 和 `iFinD 取数` 两项变 🟢，就说明装好了。

## 参考文档
- `USAGE.md` —— iFinD 封装的用法、常用代码清单、字段说明（原 `~/.ifind/README.md`）。

## 说明
- `ifind_helper.py` 里有几处写死的路径（如 SDK 目录 `C:\Users\53271\Downloads\...`）是原作者机器的，只在 `import iFinDPy` 失败时才作兜底。你按第 2 步正常装好 SDK 就不会用到它们；若确有需要，可自行改成你机器上的实际路径。
- 项目总说明见根目录 [../README.md](../README.md)。

@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: 定义根目录
set root=electric-meter-tools

:: 创建根目录
if not exist "%root%" mkdir "%root%"

:: 创建主控制面板文件
(
    echo ^<html^>
    echo ^<body^>
    echo ^<h1^>主控制面板^</h1^>
    echo ^</body^>
    echo ^</html^>
) > "%root%\index.html"

:: 创建配置文件目录
mkdir "%root%\config\protocols\dlms\request" 2>nul
mkdir "%root%\config\protocols\dlms\response" 2>nul
mkdir "%root%\config\protocols\modbus" 2>nul
mkdir "%root%\config\common" 2>nul

:: 创建配置文件
echo {} > "%root%\config\protocols\dlms\request\read.json"
echo {} > "%root%\config\protocols\dlms\request\write.json"
echo {} > "%root%\config\protocols\dlms\response\normal.json"
echo {} > "%root%\config\protocols\dlms\response\error.json"
echo {} > "%root%\config\protocols\modbus\function-codes.json"
echo {} > "%root%\config\protocols\modbus\data-types.json"
echo {} > "%root%\config\common\units.json"
echo {} > "%root%\config\common\error-codes.json"

:: 创建静态资源目录
mkdir "%root%\assets\css" 2>nul
mkdir "%root%\assets\js\utils" 2>nul
mkdir "%root%\assets\img\icons" 2>nul
mkdir "%root%\assets\img\logos" 2>nul
mkdir "%root%\assets\fonts" 2>nul

:: 创建静态资源文件
(
    echo /* 主样式文件 */
) > "%root%\assets\css\main.css"

(
    echo /* 控制面板专用样式 */
) > "%root%\assets\css\dashboard.css"

(
    echo /* 通用工具类样式 */
) > "%root%\assets\css\utilities.css"

(
    echo // 主JavaScript文件
) > "%root%\assets\js\main.js"

(
    echo // 串口相关工具
) > "%root%\assets\js\utils\serial.js"

(
    echo // 解析工具
) > "%root%\assets\js\utils\parser.js"

(
    echo // 生成器工具
) > "%root%\assets\js\utils\generator.js"

:: 创建工具页面目录
mkdir "%root%\tools\serial-tool" 2>nul
mkdir "%root%\tools\command-parser" 2>nul
mkdir "%root%\tools\command-generator" 2>nul
mkdir "%root%\tools\log-analyzer" 2>nul
mkdir "%root%\tools\monitor-analyzer" 2>nul

:: 创建工具页面文件
(
    echo ^<html^>
    echo ^<body^>
    echo ^<h1^>串口工具^</h1^>
    echo ^</body^>
    echo ^</html^>
) > "%root%\tools\serial-tool\index.html"

(
    echo /* 串口工具样式 */
) > "%root%\tools\serial-tool\styles.css"

(
    echo // 串口工具脚本
) > "%root%\tools\serial-tool\script.js"

:: 重复上述步骤创建其他工具页面文件
:: ...

:: 创建文档目录
mkdir "%root%\docs" 2>nul

:: 创建文档文件
(
    echo # 用户手册
) > "%root%\docs\user-manual.md"

(
    echo # API参考
) > "%root%\docs\api-reference.md"

(
    echo # 更新日志
) > "%root%\docs\changelog.md"

(
    echo # 贡献指南
) > "%root%\docs\contributing.md"

:: 创建项目说明文件
(
    echo # Electric Meter Tools Project
) > "%root%\README.md"

echo 目录结构创建完成！
pause
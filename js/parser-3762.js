/**
 * 解析376.2协议帧
 * @returns {void}
 */
async function parseHex_3762() {
    // 获取输入框和结果显示区域的DOM元素
    const inputElement = document.getElementById('hexInput_3762');
    const resultDiv = document.getElementById('result_3762');
    const input = inputElement.value.trim(); // 获取输入值并去除首尾空格

    // 1. 输入验证：检查输入是否为有效的十六进制字符串
    if (!isValidHexInput(input)) {
        resultDiv.innerHTML = "输入无效，请输入有效的十六进制字符串（如：68 0C 00 40 01 18 01 01 02 E8 45 16）。";
        return;
    }

    // 2. 转换为字节数组：将输入的十六进制字符串转换为字节数组
    const bytes = hexStringToBytes(input);
    if (!bytes) {
        resultDiv.innerHTML = "输入格式错误，请确保每两个字符表示一个字节（如：68 2E）。";
        return;
    }

    // 3. 解析帧：调用解析函数解析字节数组
    try {
        const frame = await parse3762Frame(bytes);
        display3762Result(frame, resultDiv); // 显示解析结果
    } catch (error) {
        resultDiv.innerHTML = `解析错误: ${error.message}`; // 捕获并显示解析错误
    }
}

// ====================== 工具函数 ======================

/**
 * 验证十六进制输入是否有效
 * @param {string} input 十六进制字符串
 * @returns {boolean} 是否有效
 */
function isValidHexInput(input) {
    // 使用正则表达式验证输入是否为有效的十六进制字符串
    return /^([0-9A-Fa-f]{2}\s?)+$/.test(input);
}

/**
 * 将十六进制字符串转换为字节数组
 * @param {string} hexStr 十六进制字符串
 * @returns {number[]|null} 字节数组或null（如果格式错误）
 */
function hexStringToBytes(hexStr) {
    const hexArray = hexStr.split(/\s+/); // 按空格分割字符串
    const bytes = [];

    for (const hex of hexArray) {
        if (hex.length !== 2) return null; // 每个字节必须是两位十六进制数
        const byte = parseInt(hex, 16); // 将十六进制字符串转换为数字
        if (isNaN(byte)) return null; // 如果转换失败，返回null
        bytes.push(byte); // 将字节添加到数组
    }

    return bytes;
}

/**
 * 解析376.2协议帧
 * @param {number[]} bytes 字节数组
 * @returns {object} 解析结果
 */
async function parse3762Frame(bytes) {
    // 1. 基本帧结构验证
    if (bytes.length < 6) {
        throw new Error("帧长度过短");
    }

    if (bytes[0] !== 0x68 || bytes[bytes.length - 1] !== 0x16) {
        throw new Error("帧起始/结束符无效");
    }

    // 2. 解析长度
    const frameLenByte = bytes.slice(1, 1 + 2); // 获取长度字段的字节
    const frameLenInfo = bytes[1] + (bytes[2] << 8); // 计算长度值
    if (frameLenInfo !== bytes.length) {
        throw new Error(`长度不匹配: 声明长度=${frameLenInfo}, 实际长度=${bytes.length}`);
    }

    // 3. 计算校验和
    const declaredChecksum = bytes[frameLenInfo - 2]; // 获取声明的校验和
    const calculatedChecksum = calculateChecksum(bytes, 3, frameLenInfo - 2); // 计算校验和
    const checksumValid = declaredChecksum === calculatedChecksum; // 校验和是否有效

    // 4. 解析控制域
    const controlByte = bytes[3];
    const controlInfo = {
        direction: (controlByte & 0x80) ? '上行报文' : '下行报文', // 传输方向位
        source: (controlByte & 0x40) ? '来自启动站' : '来自从动站', // 启动标志位
        hasAddress: (controlByte & 0x20) ? '带地址域' : '不带地址域', // 地址域标识
        version: (controlByte >> 2) & 0b11, // 协议版本号
        reserved: controlByte & 0b11 // 保留位
    };

    // 5. 解析用户数据
    const userDataByte = bytes.slice(4, frameLenInfo - 2); // 获取用户数据部分
    const userDataInfo = parseUserData(userDataByte, controlByte); // 解析用户数据

    // 补充 JSON 数据
    const file_func = `${userDataInfo.di[3]}_${userDataInfo.di[1]}`; // 构造文件名
    const file_path = `json/3762/${file_func}.json`; // 构造JSON文件路径
    try {
        const response = await fetch(file_path); // 请求JSON文件
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json(); // 解析JSON数据
        userDataInfo.json = data[`${file_func}`]; // 将JSON数据添加到用户数据信息中
    } catch (error) {
        console.error('There has been a problem with your fetch operation:', error);
        userDataInfo.json = null;
    }

    // 返回解析结果
    return {
        start: bytes[0],
        length: {
            byte: frameLenByte,
            info: frameLenInfo,
        },
        control: {
            byte: controlByte,
            info: controlInfo,
        },
        userData: {
            byte: userDataByte,
            info: userDataInfo,
        },
        checksum: {
            declared: declaredChecksum,
            calculated: calculatedChecksum,
            valid: checksumValid,
        },
        end: bytes[frameLenInfo - 1]
    };
}

/**
 * 计算校验和
 * @param {number[]} bytes 字节数组
 * @param {number} start 起始索引
 * @param {number} end 结束索引
 * @returns {number} 校验和
 */
function calculateChecksum(bytes, start, end) {
    let sum = 0;
    for (let i = start; i < end; i++) {
        sum += bytes[i]; // 累加字节
    }
    return sum & 0xFF; // 返回校验和（取低8位）
}

/**
 * 解析用户数据
 * @param {number[]} userData 用户数据字节数组
 * @param {number} controlByte 控制域字节
 * @returns {object} 解析结果
 */
function parseUserData(userData, controlByte) {
    let offset = 0;
    const result = {};

    // 1. 地址域（如果存在）
    if (controlByte & 0x20) {
        if (userData.length < 12) {
            throw new Error("地址域数据不足");
        }

        result.address = {
            source: userData.slice(0, 6).map(b => b.toString(16).padStart(2, '0').toUpperCase()), // 源地址
            destination: userData.slice(6, 12).map(b => b.toString(16).padStart(2, '0').toUpperCase()) // 目的地址
        };
        offset = 12;
    }

    // 2. 应用功能码
    if (userData.length <= offset) {
        throw new Error("缺少应用功能码");
    }
    result.afn = userData[offset].toString(16).padStart(2, '0').toUpperCase(); // 应用功能码
    offset++;

    // 3. 帧序列域
    if (userData.length <= offset) {
        throw new Error("缺少帧序列域");
    }
    result.seq = {
        hex: userData[offset].toString(16).padStart(2, '0').toUpperCase(), // 帧序列域十六进制表示
        decimal: userData[offset] // 帧序列域十进制表示
    };
    offset++;

    // 4. 数据识别编码
    if (userData.length < offset + 4) {
        throw new Error("缺少完整的数据识别编码");
    }
    result.di = userData.slice(offset, offset + 4).map(b => b.toString(16).padStart(2, '0').toUpperCase()); // 数据识别编码
    offset += 4;

    // 5. 剩余数据
    if (offset < userData.length) {
        result.data = userData.slice(offset).map(b => b.toString(16).padStart(2, '0').toUpperCase()); // 剩余数据
    }

    return result;
}

/**
 * 显示解析结果
 * @param {object} frame 解析结果对象，包含帧的各个部分及其详细信息
 * @param {HTMLElement} resultDiv 结果显示区域的DOM元素
 */
function display3762Result(frame, resultDiv) {
    resultDiv.innerHTML = ''; // 清空结果显示区域，避免重复显示旧结果

    // 1. 创建简洁结果行
    // 创建一个段落元素，用于显示简洁的解析结果
    const summary = document.createElement('p');
    summary.classList.add('result'); // 添加样式类，用于控制显示样式
    summary.innerHTML = `解析结果: 
        <span class="header">${frame.start.toString(16).padStart(2, '0').toUpperCase()}</span>  <!-- 起始字符 -->
        <span class="length">${frame.length.byte.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')}</span>  <!-- 长度字段 -->
        <span class="control">${frame.control.byte.toString(16).padStart(2, '0').toUpperCase()}</span>  <!-- 控制域 -->
        <span class="data">${frame.userData.byte.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')}</span>  <!-- 用户数据 -->
        <span class="cs">${frame.checksum.declared.toString(16).padStart(2, '0').toUpperCase()}</span>  <!-- 校验和 -->
        <span class="footer">${frame.end.toString(16).padStart(2, '0').toUpperCase()}</span>  <!-- 结束字符 -->
    `;
    resultDiv.appendChild(summary); // 将简洁结果行添加到结果显示区域

    // 2. 显示详细解析结果
    // 调用辅助函数，逐个显示帧的各个部分的详细信息
    appendDetailSection(resultDiv, 'header', '起始', `${frame.start.toString(16).padStart(2, '0').toUpperCase()}H`);
    appendDetailSection(resultDiv, 'length', '长度', `${frame.length.info} (${frame.length.info.toString(16).padStart(4, '0').toUpperCase()}H)`);

    // 控制域详情
    appendDetailSection(resultDiv, 'control', '控制域', `${frame.control.byte.toString(16).padStart(2, '0').toUpperCase()}H`);
    const controlTable = createControlTable(frame.control); // 创建控制域的详细表格
    resultDiv.appendChild(controlTable);

    // 用户数据详情
    appendDetailSection(resultDiv, 'data', '用户数据', `${frame.userData.byte.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')}`);
    const userDataTable = createUserDataTable(frame.userData.info, frame.control.info); // 创建用户数据的详细表格
    resultDiv.appendChild(userDataTable);

    // 校验和
    const checksumStatus = frame.checksum.valid ? '有效' : `无效（应为 ${frame.checksum.calculated.toString(16).padStart(2, '0').toUpperCase()}H）`;
    appendDetailSection(resultDiv, frame.checksum.valid ? 'cs' : 'error', '帧校验和',
        `${frame.checksum.declared.toString(16).padStart(2, '0').toUpperCase()}H (${checksumStatus})`);

    appendDetailSection(resultDiv, 'footer', '结束', `${frame.end.toString(16).padStart(2, '0').toUpperCase()}H`);
}

// ====================== 显示辅助函数 ======================

/**
 * 在结果显示区域追加详细解析结果
 * @param {HTMLElement} container 结果显示区域的DOM元素
 * @param {string} className 类名，用于添加样式
 * @param {string} title 标题，用于标识该部分的内容
 * @param {string} content 内容，显示该部分的详细信息
 */
function appendDetailSection(container, className, title, content) {
    // 创建一个新的段落元素，用于显示标题和内容
    const element = document.createElement('p');

    // 为段落元素添加指定的类名，以便通过CSS进行样式控制
    element.classList.add(className);

    // 设置段落元素的HTML内容，包含标题和内容
    // 使用 <strong> 标签加粗标题，使其更突出
    element.innerHTML = `<strong>${title}:</strong> ${content}`;

    // 将创建的段落元素添加到结果显示区域
    container.appendChild(element);
}

/**
 * 创建控制域的详细表格
 * @param {object} control 控制域信息对象，包含控制域字节及其解析后的详细信息
 * @returns {HTMLTableElement} 返回一个HTML表格元素，显示控制域的详细信息
 */
function createControlTable(control) {
    // 创建一个表格元素，用于显示控制域的详细信息
    const table = document.createElement('table');

    // 创建表头部分
    const thead = document.createElement('thead');
    // 表头内容：定义控制域的各个位的名称
    thead.innerHTML = `
        <tr>
            <th>D7</th> <!-- 传输方向位 -->
            <th>D6</th> <!-- 启动标志位 -->
            <th>D5</th> <!-- 地址域标识 -->
            <th>D4-D3</th> <!-- 协议版本号 -->
            <th>D2-D0</th> <!-- 保留位 -->
        </tr>
    `;
    table.appendChild(thead); // 将表头添加到表格中

    // 创建表体部分
    const tbody = document.createElement('tbody');
    // 表体内容：定义控制域的各个位的描述和值
    tbody.innerHTML = `
        <tr>
            <td>传输方向位 DIR</td> <!-- D7: 传输方向位 -->
            <td>启动标志位 PRM</td> <!-- D6: 启动标志位 -->
            <td>地址域标识 ADD</td> <!-- D5: 地址域标识 -->
            <td>协议版本号 VER</td> <!-- D4-D3: 协议版本号 -->
            <td>保留</td> <!-- D2-D0: 保留位 -->
        </tr>
        <tr>
            <td>${control.info.direction}</td> <!-- 显示D7位的值 -->
            <td>${control.info.source}</td> <!-- 显示D6位的值 -->
            <td>${control.info.hasAddress}</td> <!-- 显示D5位的值 -->
            <td>${control.info.version}</td> <!-- 显示D4-D3位的值 -->
            <td>${control.info.reserved}</td> <!-- 显示D2-D0位的值 -->
        </tr>
    `;
    table.appendChild(tbody); // 将表体添加到表格中

    return table; // 返回创建好的表格元素
}

/**
 * 解析BS类型字段的位说明
 * @param {string} desc 字段描述，包含位的名称和位置信息，例如 "任务响应标识(7)" 或 "任务优先级(0-3)"
 * @returns {Object} 返回一个对象，键为位名称，值为包含起始位、结束位和长度的配置对象
 */
function parseBitSpecification(desc) {
    const bitSpec = {}; // 创建一个空对象，用于存储位的配置信息

    // 匹配所有位说明，例如 "任务响应标识(7)"，"任务优先级(0-3)"
    // 正则表达式解释：
    // - ([^,]+)：匹配逗号之前的任意字符，表示位的名称
    // - \((\d+)(?:-(\d+))?\)：匹配括号内的数字，可能是一个范围（例如 "0-3"），也可能是一个单独的数字
    const bitMatches = desc.match(/([^,]+)\((\d+)(?:-(\d+))?\)/g);

    // 如果存在匹配的位说明
    if (bitMatches) {
        bitMatches.forEach(match => {
            // 解析单个位说明
            // 正则表达式解释：
            // - ([^\(]+)：匹配括号之前的任意字符，表示位的名称
            // - \((\d+)(?:-(\d+))?\)：匹配括号内的数字，可能是一个范围（例如 "0-3"），也可能是一个单独的数字
            const specMatch = match.match(/([^\(]+)\((\d+)(?:-(\d+))?\)/);
            if (specMatch) {
                const bitName = specMatch[1].trim(); // 获取位的名称，并去除首尾空格
                const startBit = parseInt(specMatch[2]); // 获取起始位
                const endBit = specMatch[3] ? parseInt(specMatch[3]) : startBit; // 获取结束位，如果没有范围则使用起始位

                // 将位的配置信息存储到对象中
                bitSpec[bitName] = {
                    startBit: startBit, // 起始位
                    endBit: endBit, // 结束位
                    length: endBit - startBit + 1 // 位的长度（包含起始位和结束位）
                };
            }
        });
    }

    return bitSpec; // 返回包含位配置信息的对象
}

/**
 * 处理BS类型字段
 * @param {Array<string>} hexPart 十六进制数据数组，表示一个字节的十六进制值
 * @param {string} desc 字段描述，包含位的名称和位置信息，例如 "任务响应标识(7)" 或 "任务优先级(0-3)"
 * @returns {Object} 返回一个对象，包含十六进制值、二进制值、位详细信息和整数值
 */
function processBitField(hexPart, desc) {
    // 将十六进制数据数组转换为字符串，例如 ["A1"] 转换为 "A1"
    const hexStr = hexPart.join(' ');

    // 将十六进制字符串转换为整数值
    const byteValue = parseInt(hexPart[0], 16);

    // 将整数值转换为8位二进制字符串，例如 0xA1 转换为 "10100001"
    const bits = byteValue.toString(2).padStart(8, '0');

    // 调用 parseBitSpecification 函数解析字段描述，获取位的配置信息
    const bitSpec = parseBitSpecification(desc);

    // 创建一个对象，用于存储位的详细信息
    const bitDetails = {};

    // 遍历位的配置信息
    for (const [name, spec] of Object.entries(bitSpec)) {
        // 计算位在二进制字符串中的起始和结束位置
        // 注意：二进制字符串是从左到右，高位到低位，因此需要从7开始计算
        const startPos = 7 - spec.endBit; // 起始位置
        const endPos = 7 - spec.startBit + 1; // 结束位置

        // 从二进制字符串中提取对应的位字段
        const bitValue = bits.slice(startPos, endPos);

        // 将位的详细信息存储到 bitDetails 对象中
        bitDetails[name] = {
            bits: bitValue, // 位的二进制值
            value: parseInt(bitValue, 2), // 位的整数值
            position: spec.startBit === spec.endBit
                ? `位${spec.startBit}` // 如果是单个位，显示为 "位X"
                : `位${spec.startBit}-位${spec.endBit}` // 如果是范围，显示为 "位X-位Y"
        };
    }

    // 返回包含十六进制值、二进制值、位详细信息和整数值的对象
    return {
        hexValue: hexStr, // 十六进制值
        binaryValue: bits, // 二进制值
        bitDetails: bitDetails, // 位的详细信息
        intValue: byteValue // 整数值
    };
}

/**
 * 根据配置解析十六进制数据数组
 * @param {Array<string>} dataArray 要解析的十六进制数据数组，例如 ["01", "A2", "34"]
 * @param {Array<Object>} config 解析配置数组，每个配置项定义了数据的类型、长度和描述
 * @returns {string} 格式化后的解析结果字符串（HTML格式），包含字段名称、值和详细信息
 */
function parseDataByConfig(dataArray, config) {
    // 输入验证：确保输入的 dataArray 是数组
    if (!Array.isArray(dataArray)) {
        throw new Error('数据输入必须是数组');
    }

    // 输入验证：确保输入的 config 是数组
    if (!Array.isArray(config)) {
        throw new Error('配置输入必须是数组');
    }

    // 初始化变量
    let position = 0; // 当前解析的位置
    let result = {}; // 用于存储解析结果的对象
    let resultStr = ''; // 用于存储最终的HTML格式结果字符串

    // 遍历配置中的每个字段
    for (const field of config) {
        // 解析字段名称和描述
        const [fieldName, fieldDesc] = Object.entries(field)[0];

        // 初始化字段值
        let value;

        // 特殊处理报文内容字段
        if (fieldName === '报文内容') {
            // 检查是否已解析报文长度字段
            if (!result['报文长度']?.intValue) {
                throw new Error('缺少报文长度字段');
            }

            // 获取报文长度
            const length = result['报文长度'].intValue;

            // 检查数据是否足够
            if (position + length > dataArray.length) {
                throw new Error('数据不足，无法解析报文内容');
            }

            // 提取报文内容
            const hexStr = dataArray.slice(position, position + length).join(' ');
            value = {
                hexStr: hexStr, // 十六进制字符串
                intValue: parseInt(hexStr.replace(/\s/g, ''), 16) // 整数值
            };

            // 更新解析位置
            position += length;
        } else {
            // 处理标准字段
            // 匹配字段类型，例如 "BIN"、"BS"、"ASCII" 等
            const typeMatch = fieldDesc.match(/^(BIN|BS|ASCII|YYMMDD|BCD)/);
            if (!typeMatch) {
                throw new Error(`无法识别的字段类型: ${fieldDesc}`);
            }

            // 获取字段类型
            const type = typeMatch[1];

            // 匹配字段长度，例如 "2字节"
            const size = parseInt(fieldDesc.match(/(\d+)字节/)?.[1] || '1', 10);

            // 检查数据是否足够
            if (position + size > dataArray.length) {
                throw new Error(`数据不足，无法解析字段: ${fieldName}`);
            }

            // 提取字段数据
            const hexPart = dataArray.slice(position, position + size);
            const hexStr = hexPart.join(' ');

            // 更新解析位置
            position += size;

            // 根据字段类型进行解析
            if (type === 'BIN') {
                // 小端序解析
                const littleEndianHex = [...hexPart].reverse().join('');
                const intValue = parseInt(littleEndianHex, 16);
                value = {
                    intValue: intValue,
                    hexStr: `${intValue} (${hexStr} → ${littleEndianHex}H)` // 显示整数值和十六进制值
                };
            } else if (type === 'BS') {
                // 位字段类型
                const byteValue = processBitField(hexPart, fieldDesc); // 调用 processBitField 解析位字段
                value = {
                    hexStr: `${byteValue.hexValue}H (二进制: ${byteValue.binaryValue})`, // 显示十六进制值和二进制值
                    bitDetails: byteValue.bitDetails // 位详细信息
                };
            } else if (type === 'ASCII') {
                // ASCII类型：将十六进制直接转换为ASCII字符串
                const asciiStr = hexPart.map(hex => {
                    const charCode = parseInt(hex, 16);
                    return charCode >= 32 && charCode <= 126 ? String.fromCharCode(charCode) : '·'; // 转换为可打印字符
                }).join('');

                value = {
                    hexStr: asciiStr, // 显示ASCII字符串
                    asciiValue: asciiStr, // ASCII值
                    length: hexPart.length // 字段长度
                };
            } else if (type === 'YYMMDD') {
                // YYMMDD类型：日期格式解析 (BCD编码)
                if (hexPart.length !== 3) {
                    throw new Error(`YYMMDD格式需要3字节，得到${hexPart.length}字节`);
                }

                value = {
                    hexStr: `20${hexPart[0]}-${hexPart[1]}-${hexPart[2]}`, // 假设21世纪
                };
            } else if (type === 'BCD') {
                // BCD类型
                value = {
                    hexStr: `${hexPart[0]}-${hexPart[1]}` // 显示BCD值
                };
            }
        }

        // 存储结果并构建输出字符串
        result[fieldName] = value;
        resultStr += `${fieldName}: ${value.hexStr}<br>`; // 添加字段名称和值到结果字符串

        // 如果是位字段，添加详细信息
        if (value.bitDetails) {
            for (const [name, detail] of Object.entries(value.bitDetails)) {
                resultStr += `&nbsp;&nbsp;${name}(${detail.position}): ${detail.value} (二进制: ${detail.bits})<br>`; // 添加位详细信息
            }
        }
    }

    // 检查是否完整解析了所有数据
    if (position < dataArray.length) {
        const remainingData = dataArray.slice(position).join(' '); // 获取未解析的剩余数据
        resultStr += `<br>未解析的剩余数据: ${remainingData}`; // 添加到结果字符串
        console.warn(`警告: 未解析的剩余数据: ${remainingData}`); // 在控制台输出警告
    }

    return resultStr; // 返回格式化后的解析结果字符串
}

/**
 * 创建用户数据的详细表格
 * @param {object} userData 用户数据信息对象，包含用户数据的字节数组及其解析后的详细信息
 * @param {object} control 控制域信息对象，包含控制域的解析结果
 * @returns {HTMLTableElement} 返回一个HTML表格元素，显示用户数据的详细信息
 */
function createUserDataTable(userData, control) {
    // 创建一个表格元素，用于显示用户数据的详细信息
    const table = document.createElement('table');
    const tbody = document.createElement('tbody'); // 创建表体部分

    // 如果用户数据包含地址域
    if (userData.address) {
        // 添加地址域信息到表格
        addTableRow(tbody, '地址域 A', `
            源地址: ${userData.address.source.join(' ')} ( ${[...userData.address.source].reverse().join('')} )<br>
            目的地址: ${userData.address.destination.join(' ')} ( ${[...userData.address.destination].reverse().join('')} )
        `);
    }

    // 添加应用功能码信息到表格
    console.log('rrr', userData.json); // 打印用户数据的JSON配置（用于调试）
    const jsonData = userData.json; // 获取用户数据的JSON配置
    if (jsonData) {
        addTableRow(tbody, '应用功能码 AFN', `${userData.afn}H (${jsonData[`名称`]})`); // 显示应用功能码及其名称
    }else{
        addTableRow(tbody, '应用功能码 AFN', `${userData.afn}H`); // 显示应用功能码
    }

    // 添加帧序列域信息到表格
    addTableRow(tbody, '帧序列域 SEQ', `${userData.seq.hex}H (${userData.seq.decimal})`); // 显示帧序列域的十六进制值和十进制值

    // 获取数据识别编码 DI 的详细信息
    if (jsonData) {
        const diData = jsonData[`${control.direction}`][[...userData.di].reverse().join(' ')];
        addTableRow(tbody, '数据识别编码 DI', `${userData.di.join(' ')} (${diData["名称"]})`); // 显示数据识别编码及其名称
    }else{
        addTableRow(tbody, '数据识别编码 DI', `${userData.di.join(' ')}`); // 显示数据识别编码
    }

    // 如果用户数据包含数据内容
    if (userData.data) {
        // 使用 parseDataByConfig 函数解析数据内容，并将其添加到表格
        if (jsonData) {
            const diData = jsonData[`${control.direction}`][[...userData.di].reverse().join(' ')];
            addTableRow(tbody, '数据内容', parseDataByConfig(userData.data, diData["字段"])); // 解析字段内容
        }else{
            addTableRow(tbody, '数据内容', `${userData.data.join(' ')}`); // 显示原始字段
        }
    }

    // 将表体添加到表格
    table.appendChild(tbody);

    // 返回创建好的表格元素
    return table;
}

/**
 * 向表格中添加行
 * @param {HTMLElement} tbody 表体元素
 * @param {string} label 行的标签（例如字段名称）
 * @param {string} value 行的值（例如字段的详细信息）
 */
function addTableRow(tbody, label, value) {
    // 创建一个新的表格行
    const row = document.createElement('tr');

    // 设置表格行的内容
    row.innerHTML = `
        <td>${label}</td> <!-- 字段名称 -->
        <td>${value}</td> <!-- 字段的详细信息 -->
    `;

    // 将表格行添加到表体
    tbody.appendChild(row);
}

function createProtocolFrameDescription() {
    const resultDiv = document.getElementById('result_3762');

    // 创建标题
    const title = document.createElement('h3');
    title.textContent = '376.2 协议帧格式说明';
    title.setAttribute('class', 'title'); // 如果需要添加样式类

    // 创建表格
    const table = document.createElement('table');

    // 表头
    const tableHeader = document.createElement('tr');
    const th1 = document.createElement('th');
    th1.textContent = '字段';
    const th2 = document.createElement('th');
    th2.textContent = '说明';
    tableHeader.appendChild(th1);
    tableHeader.appendChild(th2);
    table.appendChild(tableHeader);

    // 表格内容
    const rows = [
        { field: '起始字符（68H）', description: '固定报文头', rowspan: 2 },
        { field: '长度L', description: '' },
        { field: '控制域C', description: '控制域' },
        { field: '用户数据', description: '用户数据区' },
        { field: '校验和 CS', description: '帧校验和' },
        { field: '结束字符（16H）', description: '固定报文尾' }
    ];

    rows.forEach(row => {
        const tr = document.createElement('tr');
        const td1 = document.createElement('td');
        td1.textContent = row.field;
        if (row.rowspan) {
            td1.setAttribute('rowspan', row.rowspan);
        }
        const td2 = document.createElement('td');
        td2.textContent = row.description;
        tr.appendChild(td1);
        tr.appendChild(td2);
        table.appendChild(tr);
    });

    // 创建段落
    const paragraph1 = document.createElement('p');
    paragraph1.textContent = '长度 L：是指帧数据的总长度，由 2 字节组成，包括用户数据长度 L1 和 6 个字节的固定长度（起始字符、长度、控制域、校验和、结束字符）。';
    paragraph1.setAttribute('class', 'note');

    const paragraph2 = document.createElement('p');
    paragraph2.textContent = '帧校验和 CS：是控制域和用户数据区所有字节的八位位组算术和，不考虑溢出位。';
    paragraph2.setAttribute('class', 'note');

    // 将所有元素添加到容器
    // const container = document.createElement('div');
    resultDiv.appendChild(title);
    resultDiv.appendChild(table);
    resultDiv.appendChild(paragraph1);
    resultDiv.appendChild(paragraph2);

    // return container;
}

// // 调用函数并添加到页面
// document.addEventListener('DOMContentLoaded', () => {
//     const content = createProtocolFrameDescription();
//     document.body.appendChild(content);
// });

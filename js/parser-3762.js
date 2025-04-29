/**
 * 解析376.2协议帧
 * @returns {void}
 */
async function parseHex_3762() {
    const inputElement = document.getElementById('hexInput_3762');
    const resultDiv = document.getElementById('result_3762');
    const input = inputElement.value.trim();

    // 1. 输入验证
    if (!isValidHexInput(input)) {
        resultDiv.innerHTML = "输入无效，请输入有效的十六进制字符串（如：68 0C 00 40 01 18 01 01 02 E8 45 16）。";
        return;
    }

    // 2. 转换为字节数组
    const bytes = hexStringToBytes(input);
    if (!bytes) {
        resultDiv.innerHTML = "输入格式错误，请确保每两个字符表示一个字节（如：68 2E）。";
        return;
    }

    // 3. 解析帧
    try {
        const frame = await parse3762Frame(bytes);
        display3762Result(frame, resultDiv);
    } catch (error) {
        resultDiv.innerHTML = `解析错误: ${error.message}`;
    }
}

// ====================== 工具函数 ======================

/**
 * 验证十六进制输入是否有效
 * @param {string} input 
 * @returns {boolean}
 */
function isValidHexInput(input) {
    return /^([0-9A-Fa-f]{2}\s?)+$/.test(input);
}

/**
 * 将十六进制字符串转换为字节数组
 * @param {string} hexStr 
 * @returns {number[]|null}
 */
function hexStringToBytes(hexStr) {
    const hexArray = hexStr.split(/\s+/);
    const bytes = [];

    for (const hex of hexArray) {
        if (hex.length !== 2) return null;
        const byte = parseInt(hex, 16);
        if (isNaN(byte)) return null;
        bytes.push(byte);
    }

    return bytes;
}

/**
 * 解析376.2协议帧
 * @param {number[]} bytes 
 * @returns {object}
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
    const frameLenByte = bytes.slice(1, 1 + 2);
    const frameLenInfo = bytes[1] + (bytes[2] << 8);
    if (frameLenInfo !== bytes.length) {
        throw new Error(`长度不匹配: 声明长度=${frameLenInfo}, 实际长度=${bytes.length}`);
    }

    // 3. 计算校验和
    const declaredChecksum = bytes[frameLenInfo - 2];
    const calculatedChecksum = calculateChecksum(bytes, 3, frameLenInfo - 2);
    const checksumValid = declaredChecksum === calculatedChecksum;

    // 4. 解析控制域
    const controlByte = bytes[3];
    const controlInfo = {
        direction: (controlByte & 0x80) ? '上行报文' : '下行报文',
        source: (controlByte & 0x40) ? '来自启动站' : '来自从动站',
        hasAddress: (controlByte & 0x20) ? '带地址域' : '不带地址域',
        version: (controlByte >> 2) & 0b11,
        reserved: controlByte & 0b11
    };

    // 5. 解析用户数据
    const userDataByte = bytes.slice(4, frameLenInfo - 2);
    const userDataInfo = parseUserData(userDataByte, controlByte);

    // 补充 JSON 数据
    const file_func = `${userDataInfo.di[3]}_${userDataInfo.di[1]}`;
    const file_path = `json/3762/${file_func}.json`
    // console.log('www1', file_path);
    try {
        const response = await fetch(file_path);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json(); // 解析 JSON 数据
        userDataInfo.json = data[`${file_func}`];
        // userDataInfo.json = {
        //     name: data[`${file_func}`]["名称"],
        //     desc: data[`${file_func}`]["描述"],
        //     data: data[`${file_func}`][controlInfo.direction][[...userDataInfo.di].reverse().join(' ')],
        // };
    } catch (error) {
        console.error('There has been a problem with your fetch operation:', error);
    }

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
 * @param {number[]} bytes 
 * @param {number} start 
 * @param {number} end 
 * @returns {number}
 */
function calculateChecksum(bytes, start, end) {
    let sum = 0;
    for (let i = start; i < end; i++) {
        sum += bytes[i];
    }
    return sum & 0xFF;
}

/**
 * 解析用户数据
 * @param {number[]} userData 
 * @param {number} controlByte 
 * @returns {object}
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
            source: userData.slice(0, 6).map(b => b.toString(16).padStart(2, '0').toUpperCase()),
            destination: userData.slice(6, 12).map(b => b.toString(16).padStart(2, '0').toUpperCase())
        };
        offset = 12;
    }

    // 2. 应用功能码
    if (userData.length <= offset) {
        throw new Error("缺少应用功能码");
    }
    result.afn = userData[offset].toString(16).padStart(2, '0').toUpperCase();
    offset++;

    // 3. 帧序列域
    if (userData.length <= offset) {
        throw new Error("缺少帧序列域");
    }
    result.seq = {
        hex: userData[offset].toString(16).padStart(2, '0').toUpperCase(),
        decimal: userData[offset]
    };
    offset++;

    // 4. 数据识别编码
    if (userData.length < offset + 4) {
        throw new Error("缺少完整的数据识别编码");
    }
    result.di = userData.slice(offset, offset + 4).map(b => b.toString(16).padStart(2, '0').toUpperCase());
    offset += 4;

    // 5. 剩余数据
    if (offset < userData.length) {
        result.data = userData.slice(offset).map(b => b.toString(16).padStart(2, '0').toUpperCase());
    }

    return result;
}

/**
 * 显示解析结果
 * @param {object} frame 
 * @param {HTMLElement} resultDiv 
 */
function display3762Result(frame, resultDiv) {
    resultDiv.innerHTML = '';

    // 1. 创建简洁结果行
    const summary = document.createElement('p');
    summary.classList.add('result');
    summary.innerHTML = `解析结果: 
        <span class="header">${frame.start.toString(16).padStart(2, '0').toUpperCase()}</span>
        <span class="length">${frame.length.byte.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')}</span>
        <span class="control">${frame.control.byte.toString(16).padStart(2, '0').toUpperCase()}</span>
        <span class="data">${frame.userData.byte.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')}</span>
        <span class="cs">${frame.checksum.declared.toString(16).padStart(2, '0').toUpperCase()}</span>
        <span class="footer">${frame.end.toString(16).padStart(2, '0').toUpperCase()}</span>
    `;
    resultDiv.appendChild(summary);

    // 2. 显示详细解析结果
    appendDetailSection(resultDiv, 'header', '起始', `${frame.start.toString(16).padStart(2, '0').toUpperCase()}H`);

    appendDetailSection(resultDiv, 'length', '长度', `${frame.length.info} (${frame.length.info.toString(16).padStart(4, '0').toUpperCase()}H)`);

    // 控制域详情
    appendDetailSection(resultDiv, 'control', '控制域', `${frame.control.byte.toString(16).padStart(2, '0').toUpperCase()}H`);
    const controlTable = createControlTable(frame.control);
    resultDiv.appendChild(controlTable);

    // 用户数据详情
    appendDetailSection(resultDiv, 'data', '用户数据', `${frame.userData.byte.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')}`);
    const userDataTable = createUserDataTable(frame.userData.info, frame.control.info);
    resultDiv.appendChild(userDataTable);

    // 校验和
    const checksumStatus = frame.checksum.valid ? '有效' : `无效（应为 ${frame.checksum.calculated.toString(16).padStart(2, '0').toUpperCase()}H）`;
    appendDetailSection(resultDiv, frame.checksum.valid ? 'cs' : 'error', '帧校验和',
        `${frame.checksum.declared.toString(16).padStart(2, '0').toUpperCase()}H (${checksumStatus})`);

    appendDetailSection(resultDiv, 'footer', '结束', `${frame.end.toString(16).padStart(2, '0').toUpperCase()}H`);
}

// ====================== 显示辅助函数 ======================

function appendDetailSection(container, className, title, content) {
    const element = document.createElement('p');
    element.classList.add(className);
    element.innerHTML = `<strong>${title}:</strong> ${content}`;
    container.appendChild(element);
}

function createControlTable(control) {
    const table = document.createElement('table');

    // 表头
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th>D7</th>
            <th>D6</th>
            <th>D5</th>
            <th>D4-D3</th>
            <th>D2-D0</th>
        </tr>
    `;
    table.appendChild(thead);

    // 表体
    const tbody = document.createElement('tbody');
    tbody.innerHTML = `
        <tr>
            <td>传输方向位 DIR</td>
            <td>启动标志位 PRM</td>
            <td>地址域标识 ADD</td>
            <td>协议版本号 VER</td>
            <td>保留</td>
        </tr>
        <tr>
            <td>${control.info.direction}</td>
            <td>${control.info.source}</td>
            <td>${control.info.hasAddress}</td>
            <td>${control.info.version}</td>
            <td>${control.info.reserved}</td>
        </tr>
    `;
    table.appendChild(tbody);

    return table;
}

/**
 * 解析BS类型字段的位说明
 * @param {string} desc - 字段描述
 * @returns {Object} 位配置对象
 */
function parseBitSpecification(desc) {
    const bitSpec = {};

    // 匹配所有位说明，例如 "任务响应标识(7)"，"任务优先级(0-3)"
    const bitMatches = desc.match(/([^,]+)\((\d+)(?:-(\d+))?\)/g);

    if (bitMatches) {
        bitMatches.forEach(match => {
            // 解析单个位说明
            const specMatch = match.match(/([^\(]+)\((\d+)(?:-(\d+))?\)/);
            if (specMatch) {
                const bitName = specMatch[1].trim();
                const startBit = parseInt(specMatch[2]);
                const endBit = specMatch[3] ? parseInt(specMatch[3]) : startBit;

                bitSpec[bitName] = {
                    startBit: startBit,
                    endBit: endBit,
                    length: endBit - startBit + 1
                };
            }
        });
    }

    return bitSpec;
}

/**
 * 处理BS类型字段
 * @param {Array<string>} hexPart - 十六进制数据数组
 * @param {string} desc - 字段描述
 * @returns {Object} 解析结果
 */
function processBitField(hexPart, desc) {
    const hexStr = hexPart.join(' ');
    const byteValue = parseInt(hexPart[0], 16);
    const bits = byteValue.toString(2).padStart(8, '0');

    // 解析位说明
    const bitSpec = parseBitSpecification(desc);
    const bitDetails = {};

    // 根据位说明提取各个位字段
    for (const [name, spec] of Object.entries(bitSpec)) {
        // 计算位位置(注意二进制字符串是从左到右，高位到低位)
        const startPos = 7 - spec.endBit;
        const endPos = 7 - spec.startBit + 1;
        const bitValue = bits.slice(startPos, endPos);

        bitDetails[name] = {
            bits: bitValue,
            value: parseInt(bitValue, 2),
            position: spec.startBit === spec.endBit
                ? `位${spec.startBit}`
                : `位${spec.startBit}-位${spec.endBit}`
        };
    }

    return {
        hexValue: hexStr,
        binaryValue: bits,
        bitDetails: bitDetails,
        intValue: byteValue
    };
}

/**
 * 根据配置解析十六进制数据数组
 * @param {Array<string>} dataArray - 要解析的十六进制数据数组
 * @param {Array<Object>} config - 解析配置数组
 * @returns {string} 格式化后的解析结果字符串(HTML格式)
 */
function parseDataByConfig(dataArray, config) {
    // 输入验证
    if (!Array.isArray(dataArray)) {
        throw new Error('数据输入必须是数组');
    }
    if (!Array.isArray(config)) {
        throw new Error('配置输入必须是数组');
    }

    let position = 0;
    let result = {};
    let resultStr = '';

    // 遍历配置中的每个字段
    for (const field of config) {
        const [fieldName, fieldDesc] = Object.entries(field)[0];
        let value;

        // 特殊处理报文内容字段
        if (fieldName === '报文内容') {
            if (!result['报文长度']?.intValue) {
                throw new Error('缺少报文长度字段');
            }
            const length = result['报文长度'].intValue;
            const hexStr = dataArray.slice(position, position + length).join(' ');
            value = {
                hexStr: hexStr,
                intValue: parseInt(hexStr.replace(/\s/g, ''), 16)
            };
            position += length;
        }
        // 处理标准字段
        else {
            const typeMatch = fieldDesc.match(/^(BIN|BS|ASCII|YYMMDD|BCD)/);
            if (!typeMatch) {
                throw new Error(`无法识别的字段类型: ${fieldDesc}`);
            }

            const type = typeMatch[1];
            const size = parseInt(fieldDesc.match(/(\d+)字节/)?.[1] || '1', 10);

            // 检查数据是否足够
            if (position + size > dataArray.length) {
                throw new Error(`数据不足，无法解析字段: ${fieldName}`);
            }

            const hexPart = dataArray.slice(position, position + size);
            const hexStr = hexPart.join(' ');
            position += size;

            if (type === 'BIN') {
                // 小端序解析
                const littleEndianHex = [...hexPart].reverse().join('');
                const intValue = parseInt(littleEndianHex, 16);
                value = {
                    intValue: intValue,
                    hexStr: `${intValue} (${hexStr} → ${littleEndianHex}H)`
                };
            } else if (type === 'BS') {
                // 位字段类型
                let byteValue = processBitField(hexPart, fieldDesc);
                // console.log(byteValue);
                value = {
                    hexStr: `${byteValue.hexValue}H (二进制: ${byteValue.binaryValue})`,
                    bitDetails: byteValue.bitDetails,
                };
            } else if (type === 'ASCII') {
                // ASCII类型：将十六进制直接转换为ASCII字符串
                const asciiStr = hexPart.map(hex => {
                    const charCode = parseInt(hex, 16);
                    return charCode >= 32 && charCode <= 126 ? String.fromCharCode(charCode) : '·';
                }).join('');

                value = {
                    hexStr: asciiStr,
                    asciiValue: asciiStr,
                    length: hexPart.length
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
                    hexStr: `${hexPart[0]}-${hexPart[1]}`
                };
            }
        }

        // 存储结果并构建输出字符串
        result[fieldName] = value;
        resultStr += `${fieldName}: ${value.hexStr}<br>`;

        // 如果是位字段，添加详细信息
        if (value.bitDetails) {
            console.log(value.bitDetails);
            for (const [name, detail] of Object.entries(value.bitDetails)) {
                console.log(name, detail);
                resultStr += `&nbsp;&nbsp;${name}(${detail.position}): ${detail.value} (二进制: ${detail.bits})<br>`;
            }
        }
    }

    // 检查是否完整解析了所有数据
    if (position < dataArray.length) {
        const remainingData = dataArray.slice(position).join(' ');
        resultStr += `<br>未解析的剩余数据: ${remainingData}`;
        console.warn(`警告: 未解析的剩余数据: ${remainingData}`);
    }

    return resultStr;
}

function createUserDataTable(userData, control) {
    const table = document.createElement('table');
    const tbody = document.createElement('tbody');

    if (userData.address) {
        addTableRow(tbody, '地址域 A', `
            源地址: ${userData.address.source.join(' ')} ( ${[...userData.address.source].reverse().join('')} )<br>
            目的地址: ${userData.address.destination.join(' ')} ( ${[...userData.address.destination].reverse().join('')} )
        `);
    }

    console.log('rrr', userData.json);
    const jsonData = userData.json;
    addTableRow(tbody, '应用功能码 AFN', `${userData.afn}H (${jsonData[`名称`]})`);
    addTableRow(tbody, '帧序列域 SEQ', `${userData.seq.hex}H (${userData.seq.decimal})`);
    const diData = jsonData[`${control.direction}`][userData.di.reverse().join(' ')]
    addTableRow(tbody, '数据识别编码 DI', `${userData.di.join(' ')} (${diData["名称"]})`);

    if (userData.data) {
        // addTableRow(tbody, '数据内容', userData.data.join(' '));
        addTableRow(tbody, '数据内容', parseDataByConfig(userData.data, diData["字段"]));
    }

    table.appendChild(tbody);
    return table;
}

function addTableRow(tbody, label, value) {
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${label}</td>
        <td>${value}</td>
    `;
    tbody.appendChild(row);
}

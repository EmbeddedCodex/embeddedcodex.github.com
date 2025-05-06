/**
 * 解析DLT698协议帧
 * @returns {void}
 */
function parseHex_698() {
    // 获取输入框和结果显示区域的DOM元素
    const inputElement = document.getElementById('hexInput_698');
    const resultDiv = document.getElementById('result_698');
    const input = inputElement.value.trim(); // 获取输入值并去除首尾空格

    // 1. 输入验证：检查输入是否为有效的十六进制字符串
    if (!isValidHexInput(input)) {
        resultDiv.innerHTML = "输入无效，请输入有效的十六进制字符串（如：68 18 00 43 26 01 30 01 00 00 00 00 A1 83 EE 05 01 02 20 00 02 01 00 6B AF 16）。";
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
        const frame = parse698Frame(bytes);
        display698Result(frame, resultDiv); // 显示解析结果
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
    // 格式要求：每两个字符表示一个字节，字节之间可以有空格
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
 * 解析DLT698协议帧
 * @param {number[]} bytes 字节数组
 * @returns {object} 解析结果
 */
function parse698Frame(bytes) {
    // 1. 基本帧结构验证
    if (bytes.length < 12) {
        throw new Error("帧长度过短");
    }

    if (bytes[0] !== 0x68 || bytes[bytes.length - 1] !== 0x16) {
        throw new Error("帧起始/结束符无效");
    }

    // 2. 解析长度域
    const frameLenBytes = bytes.slice(1, 1 + 2); // 获取长度字段的字节
    const frameLenInfo = bytes[1] + (bytes[2] << 8); // 计算长度值
    if (frameLenInfo + 2 !== bytes.length) {
        throw new Error(`长度不匹配: 声明长度=${frameLenInfo}, 实际长度=${bytes.length - 2}`);
    }

    // 3. 解析控制域
    const controlByte = bytes[3];
    const controlInfo = {
        dir: (controlByte & 0x80) ? '服务器→客户端' : '客户端→服务器',
        prm: (controlByte & 0x40) ? '启动站' : '从动站',
        apdu: (controlByte & 0x20) ? 'APDU片段' : '完整APDU',
        reverse: (controlByte & 0x10) ? '1' : '0',
        sc: (controlByte & 0x08) ? '不加扰码' : '加扰码',
        functionCode: get698FunctionCode(controlByte & 0x07),
    };

    // 4. 解析地址域
    const addressType = get698ProtocolAddressType(bytes[4] >> 6);
    const addressLogical = (bytes[4] >> 4) & 0b11;
    const addressLength = bytes[4] & 0x0F;
    if (addressLength < 1 || addressLength > 12) {
        throw new Error(`无效地址长度: ${addressLength}`);
    }
    const addressBytes = bytes.slice(4, 4 + 1 + addressLength + 1);
    const addressBytesSA = addressBytes.slice(1, addressBytes.length - 1);

    // 5. 解析帧头校验
    const hcs = bytes.slice(6 + addressLength, 6 + addressLength + 2);

    // 6. 解析用户数据
    const userDataStart = 7 + addressLength;
    const userDataBytes = bytes.slice(userDataStart, bytes.length - 2);
    const userDataInfo = parse698DataUnit(userDataBytes);

    // 7. 解析帧校验
    const fcs = bytes.slice(bytes.length - 3, bytes.length - 1);

    return {
        start: bytes[0],
        length: {
            bytes: frameLenBytes,
            info: frameLenInfo,
        },
        control: {
            byte: controlByte,
            info: controlInfo,
        },
        address: {
            type: addressType,
            logical: addressLogical,
            length: addressLength,
            bytes: addressBytes,
            bytes_sa: addressBytesSA,
        },
        hcs: {
            bytes: hcs,
        },
        userData: {
            bytes: userDataBytes,
            info: userDataInfo,
        },
        fcs: {
            bytes: fcs,
            declared: fcs,
            // calculated: calculatedChecksum,
            // valid: checksumValid,
        },
        end: bytes[bytes.length - 1]
    };
}

/**
 * 获取DLT698功能码描述
 * @param {number} code 功能码
 * @returns {string} 功能码描述
 */
function get698FunctionCode(code) {
    const codes = {
        0x00: '保留',
        0x01: '链路管理',
        0x02: '保留',
        0x03: '用户数据',
        0x04: '保留',
        0x05: '保留',
        0x06: '保留',
        0x07: '保留',
    };
    return codes[code] || `未知功能码 (0x${code.toString(16).padStart(2, '0').toUpperCase()})`;
}

/**
 * 获取DLT698协议类型描述
 * @param {number} id 协议类型ID
 * @returns {string} 协议类型描述
 */
function get698ProtocolType(id) {
    const types = {
        0x01: '透明转发',
        0x02: '读取服务',
        0x03: '设置服务',
        0x04: '操作服务',
        0x05: '上报服务',
        0x06: '文件服务',
        0x07: '安全认证',
        0x08: '注册服务',
        0x09: '代理服务'
    };
    return types[id] || `未知协议类型 (0x${id.toString(16).padStart(2, '0').toUpperCase()})`;
}

/**
 * 获取DLT698协议地址类型描述
 * @param {number} id 地址类型ID
 * @returns {string} 地址类型描述
 */
function get698ProtocolAddressType(id) {
    const types = {
        0x01: '单地址',
        0x02: '通配地址',
        0x03: '组地址',
        0x04: '广播地址',
    };
    return types[id] || `未知地址类型 (0x${id.toString(16).padStart(2, '0').toUpperCase()})`;
}

/**
 * 解析DLT698数据单元
 * @param {number[]} data 数据单元的字节数组
 * @returns {object} 解析结果
 */
function parse698DataUnit(data) {
    if (data.length === 0) return { type: '无数据单元' };

    const result = {
        raw: data,
        hex: data.map(b => b.toString(16).padStart(2, '0').toUpperCase())
    };

    // 解析服务序号
    if (data.length >= 1) {
        result.serviceSeq = data[0];
    }

    // 解析数据单元标识
    if (data.length >= 2) {
        result.dataId = data[1];
    }

    // 解析数据内容
    if (data.length > 2) {
        result.data = {
            raw: data.slice(2),
            hex: data.slice(2).map(b => b.toString(16).padStart(2, '0').toUpperCase())
        };

        // 尝试解析OI (对象标识)
        if (data.length >= 6) {
            result.oi = {
                bytes: data.slice(2, 6),
                hex: data.slice(2, 6).map(b => b.toString(16).padStart(2, '0').toUpperCase())
            };

            // 如果有属性描述
            if (data.length >= 7) {
                result.attr = data[6];
            }

            // 如果有数据内容
            if (data.length > 7) {
                result.dataContent = {
                    raw: data.slice(7),
                    hex: data.slice(7).map(b => b.toString(16).padStart(2, '0').toUpperCase())
                };
            }
        }
    }

    return result;
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
 * 显示解析结果
 * @param {object} frame 解析结果对象
 * @param {HTMLElement} resultDiv 结果显示区域的DOM元素
 */
function display698Result(frame, resultDiv) {
    resultDiv.innerHTML = ''; // 清空结果显示区域

    // 1. 创建简洁结果行
    const summary = document.createElement('p');
    summary.classList.add('result');
    summary.innerHTML = `解析结果: 
        <span class="header">${frame.start.toString(16).padStart(2, '0').toUpperCase()}</span>
        <span class="length">${frame.length.bytes.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')}</span>
        <span class="control">${frame.control.byte.toString(16).padStart(2, '0').toUpperCase()}</span>
        <span class="address">${frame.address.bytes.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')}</span>
        <span class="cs">${frame.hcs.bytes.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')}</span>
        <span class="data">${frame.userData.bytes.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')}</span>
        <span class="cs">${frame.fcs.bytes.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')}</span>
        <span class="footer">${frame.end.toString(16).padStart(2, '0').toUpperCase()}</span>
    `;
    resultDiv.appendChild(summary);

    // 2. 显示详细解析结果
    appendDetailSection(resultDiv, 'header', '起始符', `${frame.start.toString(16).padStart(2, '0').toUpperCase()}H`);

    // 长度域
    appendDetailSection(resultDiv, 'length', '长度域', `${frame.length.info} (${frame.length.info.toString(16).padStart(4, '0').toUpperCase()}H)`);

    // 控制域
    appendDetailSection(resultDiv, 'control', '控制域', `${frame.control.byte.toString(16).padStart(2, '0').toUpperCase()}H`);
    const controlTable = create698ControlTable(frame.control);
    resultDiv.appendChild(controlTable);

    // 地址域
    appendDetailSection(resultDiv, 'address', '地址域', `${frame.address.bytes.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')}`);
    
    // 帧头校验
    appendDetailSection(resultDiv, 'cs', '帧头校验', `${frame.hcs.bytes.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')}`);
    
    // 链路用户数据
    appendDetailSection(resultDiv, 'data', '链路用户数据', `${frame.userData.bytes.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')}`);
    
    // 帧校验
    appendDetailSection(resultDiv, 'cs', '帧校验', `${frame.fcs.bytes.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')}`);
    
    appendDetailSection(resultDiv, 'footer', '结束符', `${frame.end.toString(16).padStart(2, '0').toUpperCase()}H`);
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
    const element = document.createElement('p');
    element.classList.add(className);
    element.innerHTML = `<strong>${title}:</strong> ${content}`;
    container.appendChild(element);
}

/**
 * 创建DLT698控制域的详细表格
 * @param {object} control 控制域信息对象
 * @returns {HTMLTableElement} 控制域表格
 */
function create698ControlTable(control) {
    const table = document.createElement('table');

    // 表头
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th>D7</th>
            <th>D6</th>
            <th>D5</th>
            <th>D4</th>
            <th>D3</th>
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
            <td>分帧标志</td>
            <td>保留</td>
            <td>扰码标志 SC</td>
            <td>功能码</td>
        </tr>
        <tr>
            <td>${control.info.dir}</td>
            <td>${control.info.prm}</td>
            <td>${control.info.apdu}</td>
            <td>${control.info.reverse}</td>
            <td>${control.info.sc}</td>
            <td>${control.info.functionCode}</td>
        </tr>
    `;
    table.appendChild(tbody);

    return table;
}

/**
 * 创建DLT698数据单元的详细表格
 * @param {object} dataUnit 数据单元的解析结果
 * @returns {HTMLTableElement} 数据单元表格
 */
function create698DataUnitTable(dataUnit) {
    const table = document.createElement('table');
    const tbody = document.createElement('tbody');

    if (dataUnit.serviceSeq !== undefined) {
        addTableRow(tbody, '服务序号', `${dataUnit.serviceSeq.toString(16).padStart(2, '0').toUpperCase()}H`);
    }

    if (dataUnit.dataId !== undefined) {
        addTableRow(tbody, '数据单元标识', `${dataUnit.dataId.toString(16).padStart(2, '0').toUpperCase()}H`);
    }

    if (dataUnit.oi) {
        addTableRow(tbody, '对象标识(OI)', dataUnit.oi.hex.join(' '));
    }

    if (dataUnit.attr !== undefined) {
        addTableRow(tbody, '属性描述', `${dataUnit.attr.toString(16).padStart(2, '0').toUpperCase()}H`);
    }

    if (dataUnit.dataContent) {
        addTableRow(tbody, '数据内容', dataUnit.dataContent.hex.join(' '));
    } else if (dataUnit.data) {
        addTableRow(tbody, '数据内容', dataUnit.data.hex.join(' '));
    }

    table.appendChild(tbody);
    return table;
}

/**
 * 向表格中添加行
 * @param {HTMLElement} tbody 表体元素
 * @param {string} label 行的标签（例如字段名称）
 * @param {string} value 行的值（例如字段的详细信息）
 */
function addTableRow(tbody, label, value) {
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${label}</td>
        <td>${value}</td>
    `;
    tbody.appendChild(row);
}

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
 * 解析DLT698协议帧
 * @param {number[]} originalBytes 字节数组
 * @returns {object} 解析结果
 */
function parse698Frame(originalBytes) {
    // 创建字节数组的副本以避免修改原始数据
    const bytes = [...originalBytes];

    // 辅助函数：弹出指定数量的字节
    const popBytes = (count) => {
        if (bytes.length < count) {
            throw new Error(`需要弹出${count}字节，但只剩${bytes.length}字节`);
        }
        return bytes.splice(0, count);
    };

    // 辅助函数：弹出一个字节
    const popByte = () => popBytes(1)[0];

    // 1. 基本帧结构验证
    const MIN_FRAME_LENGTH = 12;
    if (bytes.length < MIN_FRAME_LENGTH) {
        throw new Error(`帧长度过短，至少需要${MIN_FRAME_LENGTH}字节，实际收到${bytes.length}字节`);
    }

    // 验证起始字节
    const startByte = popByte();
    const START_BYTE = 0x68;
    if (startByte !== START_BYTE) {
        throw new Error(`帧起始符无效，应为0x${START_BYTE.toString(16)}，实际为0x${startByte.toString(16)}`);
    }

    // 2. 解析长度域
    const frameLenBytes = popBytes(2);
    const frameLenInfo = frameLenBytes[0] + (frameLenBytes[1] << 8);

    // 验证长度匹配（+2 因为起始字符和结束字符不算在长度值内）
    if (frameLenInfo + 2 !== originalBytes.length) {
        throw new Error(`长度不匹配: 声明长度=${frameLenInfo}，实际长度=${originalBytes.length - 2}`);
    }

    // 3. 解析控制域
    const controlByte = popByte();
    const controlInfo = {
        dir: (controlByte & 0x80) ? '服务器→客户端' : '客户端→服务器',
        prm: (controlByte & 0x40) ? '启动站' : '从动站',
        apdu: (controlByte & 0x20) ? 'APDU片段' : '完整APDU',
        reverse: (controlByte & 0x10) ? '1' : '0',
        sc: (controlByte & 0x08) ? '不加扰码' : '加扰码',
        functionCode: get698FunctionCode(controlByte & 0x07),
    };

    // 4. 解析地址域 （SA标志）1 + （逻辑+SA）addressLength + （CA）1
    const addressHeader = popByte();
    const addressType = get698ProtocolAddressType(addressHeader >> 6);
    const addressLogical = (addressHeader >> 4) & 0b11;
    const addressLength = (addressHeader & 0x0F) + 1;

    const MAX_ADDRESS_LENGTH = 16;
    if (addressLength < 1 || addressLength > MAX_ADDRESS_LENGTH) {
        throw new Error(`无效地址长度: ${addressLength}，应在1-${MAX_ADDRESS_LENGTH}范围内`);
    }

    // 弹出地址域字节 (SA标志 + 地址 + CA)
    const addressBytes = [addressHeader, ...popBytes(addressLength + 1)];
    const addressBytesSA = addressBytes.slice(1, -1);

    // 5. 解析帧头校验
    // 计算HCS校验和（从起始符后到HCS前的所有字节）
    const hcsCheckBytes = originalBytes.slice(1, originalBytes.length - bytes.length);
    const calculatedChecksumHCS = calculate698Checksum(hcsCheckBytes, 0, hcsCheckBytes.length);

    const hcs = popBytes(2);
    const declaredChecksumHCS = hcs[0] + (hcs[1] << 8);
    const checksumValidHCS = declaredChecksumHCS === calculatedChecksumHCS;

    // if (!checksumValidHCS) {
    //     throw new Error(`帧头校验失败，声明值: 0x${declaredChecksumHCS.toString(16)}，计算值: 0x${calculatedChecksumHCS.toString(16)}`);
    // }

    // 6. 解析用户数据
    // 用户数据长度 = 剩余字节 - FCS(2) - 结束符(1)
    const userDataLength = bytes.length - 3;
    const userDataBytes = popBytes(userDataLength);
    const userDataInfo = parse698DataUnit(userDataBytes);

    // 7. 解析帧校验
    const fcs = popBytes(2);
    const declaredChecksumFCS = fcs[0] + (fcs[1] << 8);

    // 计算FCS校验和（从起始符后到FCS前的所有字节）
    const fcsCheckBytes = originalBytes.slice(1, originalBytes.length - 3);
    const calculatedChecksumFCS = calculate698Checksum(fcsCheckBytes, 0, fcsCheckBytes.length);
    const checksumValidFCS = declaredChecksumFCS === calculatedChecksumFCS;

    // if (!checksumValidFCS) {
    //     throw new Error(`帧校验失败，声明值: 0x${declaredChecksumFCS.toString(16)}，计算值: 0x${calculatedChecksumFCS.toString(16)}`);
    // }

    // 验证结束字节
    const endByte = popByte();
    const END_BYTE = 0x16;
    if (endByte !== END_BYTE) {
        throw new Error(`帧结束符无效，应为0x${END_BYTE.toString(16)}，实际为0x${endByte.toString(16)}`);
    }

    // 验证所有字节已处理
    if (bytes.length > 0) {
        throw new Error(`解析完成后仍有${bytes.length}字节未处理`);
    }

    return {
        start: startByte,
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
            declared: declaredChecksumHCS,
            calculated: calculatedChecksumHCS,
            valid: checksumValidHCS,
        },
        userData: {
            bytes: userDataBytes,
            info: userDataInfo,
        },
        fcs: {
            bytes: fcs,
            declared: declaredChecksumFCS,
            calculated: calculatedChecksumFCS,
            valid: checksumValidFCS,
        },
        end: endByte
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
 * 显示解析结果
 * @param {object} frame 解析结果对象
 * @param {HTMLElement} resultDiv 结果显示区域的DOM元素
 */
function display698Result(frame, resultDiv) {
    // 清空结果显示区域
    resultDiv.innerHTML = '';

    /**
     * 将十六进制数转换为两个字节的字符串表示（低字节在前）
     * @param {number} hexNum - 要转换的十六进制数 (0-0xFFFF)
     * @returns {string} 格式为 "低字节 高字节" 的字符串
     * @throws {Error} 如果输入不是0-0xFFFF的整数
     */
    const hexToBytePairString = (hexNum) => {
        if (!Number.isInteger(hexNum) || hexNum < 0 || hexNum > 0xFFFF) {
            throw new Error('Input must be an integer between 0 and 0xFFFF');
        }
        return [
            (hexNum & 0xFF).toString(16).padStart(2, '0').toUpperCase(),
            ((hexNum >> 8) & 0xFF).toString(16).padStart(2, '0').toUpperCase()
        ].join(' ');
    };

    // 1. 创建简洁结果行
    const summary = document.createElement('p');
    summary.classList.add('result');
    summary.innerHTML = `解析结果: 
        <span class="header">${formatByte(frame.start)}</span>
        <span class="length">${formatBytes(frame.length.bytes)}</span>
        <span class="control">${formatByte(frame.control.byte)}</span>
        <span class="address">${formatBytes(frame.address.bytes)}</span>
        <span class="cs">${formatBytes(frame.hcs.bytes)}</span>
        <span class="data">${formatBytes(frame.userData.bytes)}</span>
        <span class="cs">${formatBytes(frame.fcs.bytes)}</span>
        <span class="footer">${formatByte(frame.end)}</span>
    `;
    resultDiv.appendChild(summary);

    // 2. 显示详细解析结果
    const appendDetail = (parent, className, title, content) =>
        appendDetailSection(parent, className, title, content);

    appendDetail(resultDiv, 'header', '起始符', formatByte(frame.start) + 'H');
    appendDetail(resultDiv, 'length', '长度域',
        `${frame.length.info} (${frame.length.info.toString(16).padStart(4, '0').toUpperCase()}H)`);
    appendDetail(resultDiv, 'control', '控制域', formatByte(frame.control.byte) + 'H');
    resultDiv.appendChild(create698ControlTable(frame.control));
    appendDetail(resultDiv, 'address', '地址域', formatBytes(frame.address.bytes));

    const hcsStatus = frame.hcs.valid ? '有效' : `无效（应为 ${hexToBytePairString(frame.hcs.calculated)}）`;
    appendDetail(resultDiv, frame.hcs.valid ? 'cs' : 'error', '帧校验和',
        `${formatBytes(frame.hcs.bytes)} (${hcsStatus})`);

    appendDetail(resultDiv, 'data', '链路用户数据', formatBytes(frame.userData.bytes));

    const fcsStatus = frame.fcs.valid ? '有效' : `无效（应为 ${hexToBytePairString(frame.fcs.calculated)}）`;
    appendDetail(resultDiv, frame.fcs.valid ? 'cs' : 'error', '帧校验和',
        `${formatBytes(frame.fcs.bytes)} (${fcsStatus})`);

    appendDetail(resultDiv, 'footer', '结束符', formatByte(frame.end) + 'H');
}

// ====================== 显示辅助函数 ======================

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

function createProtocol698FrameDescription() {
    const resultDiv = document.getElementById('result_698');
    // 创建标题
    const title = document.createElement('h3');
    title.textContent = '698 协议帧格式说明';
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
        { field: '起始字符（68H）', description: '帧头', rowspan: 5 },
        { field: '长度域 L', description: '' },
        { field: '控制域 C', description: '' },
        { field: '地址域 A', description: '' },
        { field: '帧头校验 HCS', description: '' },
        { field: '链路用户数据', description: '链路用户数据（应用层）' },
        { field: '帧校验 FCS', description: '帧尾', rowspan: 2 },
        { field: '结束字符（16H）', description: '' }
    ];

    rows.forEach(row => {
        const tr = document.createElement('tr');
        table.appendChild(tr);

        const td1 = document.createElement('td');
        td1.textContent = row.field;
        tr.appendChild(td1);

        if (row.description) {
            const td2 = document.createElement('td');
            td2.textContent = row.description;
            if (row.rowspan) {
                td2.setAttribute('rowspan', row.rowspan);
            }
            tr.appendChild(td2);
        }
    });

    // 创建段落
    const paragraph1 = document.createElement('p');
    paragraph1.textContent = '帧头校验 HCS：是对帧头部分不包含起始字符和HCS本身的所有字节的校验。';
    paragraph1.setAttribute('class', 'note');

    const paragraph2 = document.createElement('p');
    paragraph2.textContent = '帧校验 FCS：是对整帧不包含起始字符、结束字符和FCS本身的所有字节的校验。';
    paragraph2.setAttribute('class', 'note');

    // 将所有元素添加到容器
    resultDiv.appendChild(title);
    resultDiv.appendChild(table);
    resultDiv.appendChild(paragraph1);
    resultDiv.appendChild(paragraph2);
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("p698.js");
});
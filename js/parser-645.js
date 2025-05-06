/**
 * 解析DLT645协议帧
 * @returns {void}
 */
function parseHex_645() {
    // 获取输入框和结果显示区域的DOM元素
    const inputElement = document.getElementById('hexInput_645');
    const resultDiv = document.getElementById('result_645');
    const input = inputElement.value.trim(); // 获取输入值并去除首尾空格

    // 1. 输入验证：检查输入是否为有效的十六进制字符串
    if (!isValidHexInput(input)) {
        resultDiv.innerHTML = "输入无效，请输入有效的十六进制字符串（如：68 11 11 11 11 11 11 68 91 06 33 33 33 33 33 33 7A 16）。";
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
        const frame = parse645Frame(bytes);
        display645Result(frame, resultDiv); // 显示解析结果
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
 * 解析DLT645协议帧
 * @param {number[]} bytes 字节数组
 * @returns {object} 解析结果
 */
function parse645Frame(bytes) {
    // 1. 基本帧结构验证
    if (bytes.length < 12) {
        throw new Error("帧长度过短");
    }

    if (bytes[0] !== 0x68 || bytes[7] !== 0x68 || bytes[bytes.length - 1] !== 0x16) {
        throw new Error("帧起始/结束符无效");
    }

    // 2. 解析地址域 (6字节)
    const address = bytes.slice(1, 7);

    // 3. 解析控制码
    const controlByte = bytes[8];
    const controlInfo = {
        direction: (controlByte & 0x80) ? '从站→主站' : '主站→从站',
        isBroadcast: (controlByte & 0x40) ? '异常应答' : '正确应答',
        hasNext: (controlByte & 0x20) ? '有后续帧' : '无后续帧',
        functionCode: get645FunctionCode(controlByte & 0x1F),
    };

    // 4. 解析数据长度
    const dataLength = bytes[9];
    if (dataLength + 12 !== bytes.length) {
        throw new Error(`数据长度不匹配: 声明长度=${dataLength}, 实际长度=${bytes.length - 12}`);
    }

    // 5. 解析数据域 (需要减去0x33)
    let data = [];
    if (dataLength > 0) {
        data = bytes.slice(10, 10 + dataLength).map(b => (b - 0x33) & 0xFF);
    }

    // 6. 解析校验和
    const declaredChecksum = bytes[bytes.length - 2];
    const calculatedChecksum = calculateChecksum(bytes, 0, bytes.length - 2);
    const checksumValid = declaredChecksum === calculatedChecksum;

    // 7. 解析数据标识 (DI) 和数据 (如果存在)
    let diInfo = {};
    let dataInfo = {};

    if (data.length >= 4) {
        // 数据标识 (4字节)
        diInfo = {
            bytes: data.slice(0, 4),
            hex: data.slice(0, 4).map(b => b.toString(16).padStart(2, '0').toUpperCase())
        };

        // 剩余数据
        if (data.length > 4) {
            dataInfo = {
                bytes: data.slice(4),
                hex: data.slice(4).map(b => b.toString(16).padStart(2, '0').toUpperCase())
            };
        }
    }

    return {
        start: bytes[0],
        address: address,
        start2: bytes[7],
        control: {
            byte: controlByte,
            info: controlInfo,
        },
        dataLength: dataLength,
        data: {
            raw: bytes.slice(10, 10 + dataLength),
            actual: data,
            di: diInfo,
            content: dataInfo
        },
        checksum: {
            declared: declaredChecksum,
            calculated: calculatedChecksum,
            valid: checksumValid,
        },
        end: bytes[bytes.length - 1]
    };
}

/**
 * 获取DLT645功能码描述
 * @param {number} code 功能码
 * @returns {string} 功能码描述
 */
function get645FunctionCode(code) {
    const codes = {
        0b00000: '保留',
        0b01000: '广播校时',
        0b10001: '读数据',
        0b10010: '读后续数据',
        0b10011: '读通信地址',
        0b10100: '写数据',
        0b10101: '写通信地址',
        0b10110: '冻结命令',
        0b10111: '更改通信速率',
        0b11000: '修改密码',
        0b11001: '修改需量清零',
        0b11010: '电表清零',
        0b11011: '事件清零',
    };
    return codes[code] || `未知功能码 (0x${code.toString(16).padStart(2, '0').toUpperCase()})`;
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
function display645Result(frame, resultDiv) {
    resultDiv.innerHTML = ''; // 清空结果显示区域

    // 1. 创建简洁结果行
    const summary = document.createElement('p');
    summary.classList.add('result');
    summary.innerHTML = `解析结果: 
        <span class="header">${frame.start.toString(16).padStart(2, '0').toUpperCase()}</span>
        <span class="address">${frame.address.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')}</span>
        <span class="header">${frame.start2.toString(16).padStart(2, '0').toUpperCase()}</span>
        <span class="control">${frame.control.byte.toString(16).padStart(2, '0').toUpperCase()}</span>
        <span class="length">${frame.dataLength.toString(16).padStart(2, '0').toUpperCase()}</span>
        <span class="data">${frame.data.raw.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')}</span>
        <span class="cs">${frame.checksum.declared.toString(16).padStart(2, '0').toUpperCase()}</span>
        <span class="footer">${frame.end.toString(16).padStart(2, '0').toUpperCase()}</span>
    `;
    resultDiv.appendChild(summary);

    // 2. 显示详细解析结果
    appendDetailSection(resultDiv, 'header', '起始符1', `${frame.start.toString(16).padStart(2, '0').toUpperCase()}H`);

    // 地址域
    appendDetailSection(resultDiv, 'address', '地址域', `${frame.address.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')}`);

    appendDetailSection(resultDiv, 'header', '起始符2', `${frame.start2.toString(16).padStart(2, '0').toUpperCase()}H`);

    // 控制域
    appendDetailSection(resultDiv, 'control', '控制码', `${frame.control.byte.toString(16).padStart(2, '0').toUpperCase()}H`);
    const controlTable = create645ControlTable(frame.control);
    resultDiv.appendChild(controlTable);

    // 数据长度
    appendDetailSection(resultDiv, 'length', '数据长度', `${frame.dataLength} (${frame.dataLength.toString(16).padStart(2, '0').toUpperCase()}H)`);

    // 数据域
    if (frame.dataLength > 0) {
        appendDetailSection(resultDiv, 'data', '数据域', `
            ${frame.data.raw.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')}
            (${frame.data.actual.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')})
        `);
    }

    // 校验和
    const checksumStatus = frame.checksum.valid ? '有效' : `无效（应为 ${frame.checksum.calculated.toString(16).padStart(2, '0').toUpperCase()}H）`;
    appendDetailSection(resultDiv, frame.checksum.valid ? 'cs' : 'error', '帧校验和',
        `${frame.checksum.declared.toString(16).padStart(2, '0').toUpperCase()}H (${checksumStatus})`);

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
 * 创建控制域的详细表格
 * @param {object} control 控制域信息对象
 * @returns {HTMLTableElement} 控制域表格
 */
function create645ControlTable(control) {
    const table = document.createElement('table');

    // 表头
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th>D7</th>
            <th>D6</th>
            <th>D5</th>
            <th>D4-D0</th>
        </tr>
    `;
    table.appendChild(thead);

    // 表体
    const tbody = document.createElement('tbody');
    tbody.innerHTML = `
        <tr>
            <td>传送方向</td>
            <td>从站应答标志</td>
            <td>后续帧标志</td>
            <td>功能码</td>
        </tr>
        <tr>
            <td>${control.info.direction}</td>
            <td>${control.info.isBroadcast}</td>
            <td>${control.info.hasNext}</td>
            <td>${control.info.functionCode}</td>
        </tr>
    `;
    table.appendChild(tbody);

    return table;
}

/**
 * 创建DLT645协议数据标识（DI）的详细表格
 * @param {object} di 数据标识对象，包含DI的字节数组及其十六进制表示
 * @returns {HTMLTableElement} 返回一个HTML表格元素，显示DI的详细信息
 */
function create645DITable(di) {
    // 创建一个表格元素，用于显示DI的详细信息
    const table = document.createElement('table');
    const tbody = document.createElement('tbody'); // 创建表体部分

    // 添加数据标识（DI）的十六进制表示到表格
    addTableRow(tbody, '数据标识 DI', di.hex.join(' '));

    // 解析DI结构 (D0-D3)
    // 将DI的每个字节转换为整数
    const di0 = parseInt(di.hex[0], 16);
    const di1 = parseInt(di.hex[1], 16);
    const di2 = parseInt(di.hex[2], 16);
    const di3 = parseInt(di.hex[3], 16);

    // 解析DI的各个部分
    const diInfo = {
        class: (di0 >> 4) & 0x0F, // 分类：D0的高4位
        group: di0 & 0x0F, // 分组：D0的低4位
        item: di1, // 项号：D1
        storage: di2, // 存储：D2
        unit: di3 // 单位：D3
    };

    // 将解析后的DI信息添加到表格
    addTableRow(tbody, 'DI解析', `
        分类: ${diInfo.class}<br>
        分组: ${diInfo.group}<br>
        项号: ${diInfo.item}<br>
        存储: ${diInfo.storage}<br>
        单位: ${diInfo.unit}
    `);

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
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${label}</td>
        <td>${value}</td>
    `;
    tbody.appendChild(row);
}

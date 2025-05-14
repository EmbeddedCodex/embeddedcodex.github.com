// main.js

const FCS_TABLE = new Uint16Array(256);

(function generateFcs16Table() {
    const POLY = 0x8408; // 预定义多项式常量

    for (let b = 0; b < 256; b++) {
        let v = b;
        for (let i = 8; i-- > 0;) {  // 倒序循环减少比较次数
            v = (v & 1) ? (v >>> 1) ^ POLY : v >>> 1;
        }
        FCS_TABLE[b] = v;
    }
})();

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
 * 将字节数组格式化为十六进制字符串
 * @param {Array<number>} bytes - 字节数组
 * @returns {string} 格式化的十六进制字符串
 */
const formatBytes = (bytes) =>
    bytes.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');

/**
 * 格式化单个字节为十六进制显示
 * @param {number} byte - 要格式化的字节
 * @returns {string} 格式化的十六进制字符串
 */
const formatByte = (byte) => byte.toString(16).padStart(2, '0').toUpperCase();

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
 * 计算校验和
 * @param {number[]} bytes 字节数组
 * @param {number} start 起始索引
 * @param {number} end 结束索引
 * @returns {number} 校验和
 */
function calculate698Checksum(bytes, start, end) {
    let fcs = 0xFFFF;

    // 提前处理空数据情况
    if (start >= end) return fcs;

    for (let i = start; i < end; i++) {
        fcs = (fcs >>> 8) ^ FCS_TABLE[(fcs ^ bytes[i]) & 0xFF];
    }

    return fcs ^ 0xFFFF;
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

// 通过字符串名称调用同名函数
function callFunctionByName(functionName) {
    // 检查函数是否存在
    if (typeof window[functionName] === 'function') {
        // 调用函数
        window[functionName]();
    } else {
        console.error(`函数 ${functionName} 不存在`);
    }
}

// 共用功能和初始化代码
function createProtocolSection(protocolName, hexInputValue, placeholder) {

    const filterName = protocolName.replace(/[^a-zA-Z0-9_]/g, '');
    // 获取目标section
    const targetSection = document.getElementById(`protocol-${filterName}`);

    // 创建内部div
    const innerDiv = document.createElement('div');

    // 创建标题
    const title = document.createElement('h2');
    title.textContent = `${protocolName} 协议解析`;

    // 创建输入组
    const inputGroup = document.createElement('div');
    inputGroup.className = 'input-group';

    // 创建输入框
    const input = document.createElement('input');
    input.type = 'text';
    input.id = `hexInput_${filterName}`;
    input.className = 'hex-input';
    input.placeholder = placeholder;
    input.value = hexInputValue;

    // 创建解析按钮
    const button = document.createElement('button');
    button.textContent = '解析';
    button.className = 'parse-btn';
    button.onclick = function () {
        callFunctionByName(`parseHex_${filterName}`); // 调用解析函数
    };

    // 创建结果显示容器
    const resultContainer = document.createElement('div');
    resultContainer.className = 'result-container';
    resultContainer.id = `result_${filterName}`;

    // 组装结构
    inputGroup.appendChild(input);
    inputGroup.appendChild(button);
    innerDiv.appendChild(title);
    innerDiv.appendChild(inputGroup);
    innerDiv.appendChild(resultContainer);
    targetSection.appendChild(innerDiv);

    // 生成帧格式说明
    callFunctionByName(`createProtocol${filterName}FrameDescription`);
}

// 调用函数并将内容添加到页面
document.addEventListener('DOMContentLoaded', () => {
    // 698协议
    const section698 = createProtocolSection(
        '698',
        '68 18 00 43 26 01 30 01 00 00 00 00 A1 83 EE 05 01 02 20 00 02 01 00 6B AF 16',
        '输入十六进制字符串，例如: 68 18 00 43 26 01 30 01 00 00 00 00 A1 83 EE 05 01 02 20 00 02 01 00 6B AF 16',
    );

    // 645协议
    const section645 = createProtocolSection(
        '645',
        '68 20 01 00 00 00 00 68 11 04 33 33 33 33 D2 16',
        '输入十六进制字符串，例如: 68 20 01 00 00 00 00 68 11 04 33 33 33 33 D2 16',
    );

    // 376.2协议
    const section3762 = createProtocolSection(
        '376.2',
        '68 2E 00 60 01 00 00 00 00 00 20 01 00 00 00 00 02 16 01 02 02 E8 02 00 83 08 07 10 68 20 01 00 00 00 00 68 11 04 33 33 33 33 D2 16 E5 16',
        '输入十六进制字符串，例如: 68 2E 00 60 01 00 00 00 00 00 20 01 00 00 00 00 02 16 01 02 02 E8 02 00 83 08 07 10 68 20 01 00 00 00 00 68 11 04 33 33 33 33 D2 16 E5 16',
    );
});

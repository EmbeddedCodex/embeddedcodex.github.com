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
 * 从字符串中提取字节大小
 * @param {string} inputStr 输入字符串（例如："4字节"）
 * @param {number} [defaultSize=1] 默认字节大小（当无法提取时使用）
 * @returns {number} 提取到的字节数
 */
function extractByteSize(inputStr, defaultSize = 1) {
    if (typeof inputStr !== 'string') {
        return defaultSize;
    }

    const match = inputStr.match(/(\d+)字节/);
    return match ? parseInt(match[1], 10) : defaultSize;
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
 * 生成指定长度的十六进制格式的00填充字符串
 * @param {number} size 要生成的字节长度 
 * @returns {string} 十六进制字符串（如 "00 00 00"）
 */
function generateZeroHexString(size) {
    if (!Number.isInteger(size)) {
        throw new Error('Size must be an integer');
    }

    return Array.from({ length: size }, () => '00').join(' ');
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
function callFunctionByName(functionName, ...args) {
    // 检查函数是否存在
    if (typeof window[functionName] === 'function') {
        // 调用函数
        window[functionName](...args);
    } else {
        console.error(`函数 ${functionName} 不存在`);
    }
}

function switchTab(protocolId, tabId) {
    // 隐藏所有标签内容
    document.querySelectorAll(`#${protocolId} .tab-content`).forEach(content => {
        content.classList.remove('active');
    });

    // // 取消所有标签项的活动状态
    // document.querySelectorAll(`#${protocolId} .tab-item`).forEach(item => {
    //     item.classList.remove('active');
    // });

    // // 显示选中的标签内容
    // document.getElementById(`${protocolId}-${tabId}`).classList.add('active');

    // 设置选中标签项的活动状态
    event.currentTarget.classList.add('active');
}

// ====================== 解析函数 ======================

// 共用功能和初始化代码
function createParserProtocolSection(protocolName, hexInputValue, placeholder) {

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

// ====================== 生成函数 ======================

function generateTable(event, tabName) {
    console.log(event, tabName);
    // 获取所有标签项
    const tabItems = document.querySelectorAll('.tab-item');
    // 获取所有标签内容
    const tabContents = document.querySelectorAll('.tab-content');

    // 移除所有标签项的active类
    tabItems.forEach(item => {
        item.classList.remove('active');
    });

    // 隐藏所有标签内容
    tabContents.forEach(content => {
        content.classList.remove('active');
    });

    // 添加active类到当前点击的标签项
    event.currentTarget.classList.add('active');

    // 显示当前标签的内容
    const activeTabContent = document.getElementById(tabName);
    activeTabContent.classList.add('active');
}

// 共用功能和初始化代码
function createGenerateProtocolSection(protocolName, hexInputValue, placeholder) {

    const filterName = protocolName.replace(/[^a-zA-Z0-9_]/g, '');
    // 获取目标section
    const targetSection = document.getElementById(`gen-protocol-${filterName}`);

    // 创建内部div
    const innerDiv = document.createElement('div');

    // 创建标题
    const title = document.createElement('h2');
    title.textContent = `${protocolName} 协议帧生成`;

    // 创建通信双方类型
    const typeTab = document.createElement('div');
    typeTab.className = 'tab-container';
    const typeTabItem1 = document.createElement('tab-item');
    typeTabItem1.className = 'tab-item active';
    typeTabItem1.textContent = 'E8: 终端与本地模块通信';
    typeTabItem1.onclick = function () {
        callFunctionByName(`generateTable`, event, 'typeTabItem1');
    }
    typeTab.appendChild(typeTabItem1);
    const typeTabItem2 = document.createElement('tab-item');
    typeTabItem2.className = 'tab-item';
    typeTabItem2.textContent = 'EA: 采集器与本地模块通信';
    typeTabItem2.onclick = function () {
        callFunctionByName(`generateTable`, event, 'typeTabItem2');
    }
    typeTab.appendChild(typeTabItem2);
    const typeTabItem3 = document.createElement('tab-item');
    typeTabItem3.className = 'tab-item';
    typeTabItem3.textContent = 'EC: 终端与USB功能模块通信';
    typeTabItem3.onclick = function () {
        callFunctionByName(`generateTable`, event, 'typeTabItem3');
    }
    typeTab.appendChild(typeTabItem3);

    // // 创建输入组
    // const inputGroup = document.createElement('div');
    // inputGroup.className = 'input-group';

    // // 创建输入框
    // const input = document.createElement('input');
    // input.type = 'text';
    // input.id = `hexInput_${filterName}`;
    // input.className = 'hex-input';
    // input.placeholder = placeholder;
    // input.value = hexInputValue;

    // // 创建解析按钮
    // const button = document.createElement('button');
    // button.textContent = '解析';
    // button.className = 'parse-btn';
    // button.onclick = function () {
    //     callFunctionByName(`parseHex_${filterName}`); // 调用解析函数
    // };

    // 创建结果显示容器
    const resultContainer = document.createElement('div');
    resultContainer.className = 'result-container';
    resultContainer.id = `generation_${filterName}`;

    // 组装结构
    // inputGroup.appendChild(input);
    // inputGroup.appendChild(button);
    innerDiv.appendChild(title);
    innerDiv.appendChild(typeTab);
    // innerDiv.appendChild(inputGroup);
    innerDiv.appendChild(resultContainer);
    targetSection.appendChild(innerDiv);

    // // 生成帧格式说明
    // callFunctionByName(`createProtocol${filterName}FrameDescription`);

    callFunctionByName(`generate_${filterName}_frame`);
}


// ====================== 侧边栏函数 ======================

/**
 * 初始化协议切换侧边栏
*/
function initializeProtocolSidebar() {
    // 定义协议数据
    const protocols = [
        { name: "376.2 协议", id: "3762" },
        { name: "645 协议", id: "645" },
        { name: "698 协议", id: "698" }
    ];

    // 获取侧边栏元素
    const sidebar = document.getElementById("protocol-sidebar");

    const switchSection = (event, sectionId) => {
        console.log("切换到：" + `protocol-${sectionId}`);

        const content = document.getElementById("protocol-content-area");

        // 隐藏所有内容区域
        content.querySelectorAll('.protocol-section').forEach(section => {
            section.classList.remove('active');
        });

        // 取消所有侧边栏项的活动状态
        sidebar.querySelectorAll('.sidebar-item').forEach(item => {
            item.classList.remove('active');
        });

        // 显示选中的内容区域
        document.getElementById(`protocol-${sectionId}`).classList.add('active');
        document.getElementById(`gen-protocol-${sectionId}`).classList.add('active');

        // 设置选中侧边栏项的活动状态
        // document.getElementById(`sidebar-item-${sectionId}`).classList.add('active');
        event.currentTarget.classList.add('active');
        console.log(event.currentTarget);
    };

    // 遍历协议数据，动态创建sidebar-item
    protocols.forEach((protocol, index) => {
        const sidebarItem = document.createElement("div"); // 创建div元素
        sidebarItem.className = "sidebar-item"; // 添加类名
        sidebarItem.id = `sidebar-item-${protocol.id}`;
        sidebarItem.onclick = (event) => switchSection(event, protocol.id); // 添加点击事件
        sidebarItem.textContent = protocol.name; // 设置文本内容

        // 如果是第一个协议，添加active类
        if (index === 0) {
            sidebarItem.classList.add("active");
            switchSection({ currentTarget: sidebarItem }, protocol.id);
        }

        sidebar.appendChild(sidebarItem); // 将sidebar-item添加到侧边栏
    });
}



function createProtocolTabs() {
    // 定义协议数据
    const protocols = [
        { name: "生成", id: "generate" },
        { name: "解析", id: "parse" },
    ];

    // 获取 protocol-tab-container 元素
    const container = document.getElementById('protocol-tab-container');

    const openTab = (event, tabId) => {
        console.log("切换到：" + `${tabId}Tab`);

        const content = document.getElementById("protocol-content-area");

        // 移除所有标签项的active类
        container.querySelectorAll('.tab-item').forEach(item => {
            item.classList.remove('active');
        });

        // 隐藏所有标签内容
        content.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });

        // 显示当前标签的内容
        document.getElementById(`${tabId}Tab`).classList.add('active');

        // 添加active类到当前点击的标签项
        event.currentTarget.classList.add('active');
    };

    // 遍历协议数据，动态创建tab-item
    protocols.forEach((protocol, index) => {
        const tabItem = document.createElement("div"); // 创建div元素
        tabItem.className = "tab-item"; // 添加类名
        tabItem.id = `tab-item-${protocol.id}`;
        tabItem.onclick = (event) => openTab(event, protocol.id); // 添加点击事件
        tabItem.textContent = protocol.name; // 设置文本内容

        // 如果是第一个协议，添加active类
        if (index === 0) {
            tabItem.classList.add("active");
            // 生成初始化界面
            openTab({ currentTarget: tabItem }, protocol.id);
        }

        container.appendChild(tabItem);
    });
}


// 调用函数并将内容添加到页面
document.addEventListener('DOMContentLoaded', () => {
    console.log("main.js");
    return;

    initializeProtocolSidebar();
    createProtocolTabs();
    // 698协议
    const section698 = createParserProtocolSection(
        '698',
        '68 18 00 43 26 01 30 01 00 00 00 00 A1 83 EE 05 01 02 20 00 02 01 00 6B AF 16',
        '输入十六进制字符串，例如: 68 18 00 43 26 01 30 01 00 00 00 00 A1 83 EE 05 01 02 20 00 02 01 00 6B AF 16',
    );

    // 645协议
    const section645 = createParserProtocolSection(
        '645',
        '68 20 01 00 00 00 00 68 11 04 33 33 33 33 D2 16',
        '输入十六进制字符串，例如: 68 20 01 00 00 00 00 68 11 04 33 33 33 33 D2 16',
    );

    // 376.2协议
    const section3762 = createParserProtocolSection(
        '376.2',
        '68 2E 00 60 01 00 00 00 00 00 20 01 00 00 00 00 02 16 01 02 02 E8 02 00 83 08 07 10 68 20 01 00 00 00 00 68 11 04 33 33 33 33 D2 16 E5 16',
        '输入十六进制字符串，例如: 68 2E 00 60 01 00 00 00 00 00 20 01 00 00 00 00 02 16 01 02 02 E8 02 00 83 08 07 10 68 20 01 00 00 00 00 68 11 04 33 33 33 33 D2 16 E5 16',
    );

    // 376.2协议
    createGenerateProtocolSection('376.2');
});

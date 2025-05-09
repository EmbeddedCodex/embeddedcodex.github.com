// main.js

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

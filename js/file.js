function createProtocolFetcher(protocolId) {
    return async function () {
        return fetchData(protocolId);
    }
}

const fetchProtocol3762Data = createProtocolFetcher("3762");
const fetchProtocol6452007Data = createProtocolFetcher("645_2007");

const protocolCache = {}; // 缓存数据，相同的协议可能会被多次请求
const skipOption = true; // 跳过json的上下行

async function fetchData(protocolId) {
    if (protocolCache[protocolId]) {
        return protocolCache[protocolId];
    }

    // 路径安全性
    if (!/^[\w_]+$/.test(protocolId)) {
        throw new Error("Invalid protocol ID");
    }

    // 请求超时
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const filePath = `json/${protocolId}.json`;

    try {
        const response = await fetch(filePath, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        protocolCache[protocolId] = data; // 缓存数据
        return data;
    } catch (error) {
        clearTimeout(timeoutId);
        console.error(`Failed to fetch protocol ${protocolId}:`, error);
        throw error; // 或者 return { error: error.message };
    }
}

/////////////////////////////////////////////////////////////////////////////////////////////////////

// 生成标签页结构的函数
function generateTabs(data, parentElement, level = 0) {
    if (!data.tabs || data.tabs.length === 0) return;

    // 创建标签容器
    const tabContainer = document.createElement('div');
    tabContainer.className = level > 0 ? 'tab nested-tab' : 'tab';

    // 创建标签按钮
    data.tabs.forEach(tab => {
        const button = document.createElement('button');
        button.className = 'tablinks';
        button.textContent = `${tab.id} ${tab.名称 ? `: ${tab.名称}` : ''}`;
        button.onclick = function (event) {
            openTab(event, tab.id);
        };
        tabContainer.appendChild(button);
    });

    parentElement.appendChild(tabContainer);

    // 创建内容区域
    data.tabs.forEach(tab => {
        const tabContent = document.createElement('div');
        tabContent.id = tab.id;
        tabContent.className = 'tabcontent';

        // 字段
        if (level === (skipOption ? 2 : 3)) {
            const contentArea = document.createElement('div');
            contentArea.className = 'content-area';
            generateInputFields(tab, contentArea);
            tabContent.appendChild(contentArea);
        }

        parentElement.appendChild(tabContent);

        // 递归生成嵌套标签
        console.log(level, tab)
        if (tab.tabs && tab.tabs.length > 0) {
            if ((skipOption === true) && (level === 1)) { // 跳过上下行选项
                generateTabs(tab.tabs[0], tabContent, level + 1);
            }
            else {
                generateTabs(tab, tabContent, level + 1);
            }
        }
    });

    // 默认打开第一个标签
    if (level === 0 && data.tabs.length > 0) {
        const firstTabId = data.tabs[0].id;
        document.getElementById(firstTabId).style.display = 'block';
        tabContainer.querySelector('button').classList.add('active');
    }
}

/**
 * 根据 JSON 数据中的 "字段" 生成 HTML 输入框
 * @param {Object} tab - 包含 "字段" 的 JSON 对象
 * @param {HTMLElement} contentArea - 用于放置生成的输入框的容器元素
 */
function generateInputFields(tab, contentArea) {
    // 检查是否存在 "字段" 且为数组
    if (tab.字段 && Array.isArray(tab.字段)) {
        try {
            // 输出日志信息
            console.log(`${tab.id} ${tab.名称 ? `: ${tab.名称}` : ''}-->字段长度：${tab.字段.length}`);

            // 遍历 "字段" 数组
            tab.字段.forEach((field, index) => {
                const fieldKey = Object.keys(field)[0]; // 获取字段名称
                const fieldValue = field[fieldKey]; // 获取字段描述

                // 创建字段名称的文本
                const label = document.createElement("label");
                label.textContent = `${fieldKey}: `;
                label.style.display = "block"; // 每个字段占一行
                label.style.marginBottom = "5px"; // 添加一些间距

                // 创建输入框
                const input = document.createElement("input");
                input.type = "text";
                input.dataset.fieldKey =  `${fieldKey}`;
                input.placeholder = fieldValue; // 将字段描述作为占位符
                input.style.width = "100%"; // 输入框宽度
                input.style.marginBottom = "10px"; // 添加一些间距

                // 将标签和输入框添加到容器中
                contentArea.appendChild(label);
                contentArea.appendChild(input);
            });

            // 空字段
            if (tab.字段.length === 0) {
                const label = document.createElement("label");
                label.textContent = `${tab.id} ${tab.名称 ? `: ${tab.名称}` : ''}-->空字段`;
                label.style.display = "block"; // 每个字段占一行
                label.style.marginBottom = "5px"; // 添加一些间距
                contentArea.appendChild(label);
            }

            // 创建按钮
            const button = document.createElement("button");
            button.textContent = "打印";
            button.style.marginLeft = "10px"; // 与输入框的间距
            button.style.width = "50px"; // 按钮宽度
            button.style.height = "25px"; // 按钮高度

            // 为按钮添加点击事件处理程序
            button.addEventListener("click", () => {
                console.log(contentArea.children)
                const inputValues = [];
                for (let child of contentArea.children) {
                    if (child.tagName === "INPUT") {
                        const fieldKey = child.dataset.fieldKey; // 获取字段名称
                        const inputValue = child.value; // 获取输入值
                        console.log(`字段: ${fieldKey}, 输入值: ${inputValue}`);
                        inputValues.push({ fieldKey, inputValue });
                    }
                }
                console.log(inputValues);
            });
            contentArea.appendChild(button);

        } catch (error) {
            console.error(`在处理 ${tab.id} ${tab.名称 ? `: ${tab.名称}` : ''} 时发生错误:`, error);
        }
    } else {
        console.log(`${tab.id} ${tab.名称 ? `: ${tab.名称}` : ''}-->不存在字段`);
    }
}

// 打开标签页的函数
function openTab(evt, tabId) {
    // 获取当前层级的所有内容
    const currentLevelContents = getCurrentLevelContents(evt.currentTarget);

    // 隐藏当前层级的所有内容
    currentLevelContents.forEach(content => {
        content.style.display = 'none';
    });

    // 移除当前层级所有按钮的active类
    const currentLevelButtons = getCurrentLevelButtons(evt.currentTarget);
    currentLevelButtons.forEach(button => {
        button.classList.remove('active');
    });

    // 显示当前标签内容并添加active类
    document.getElementById(tabId).style.display = 'block';
    evt.currentTarget.classList.add('active');
}

// 获取当前层级的所有内容元素
function getCurrentLevelContents(buttonElement) {
    const parentTab = buttonElement.closest('.tab');
    const nextElement = parentTab.nextElementSibling;
    const contents = [];

    let sibling = nextElement;
    while (sibling) {
        if (sibling.classList.contains('tabcontent')) {
            contents.push(sibling);
        } else {
            break;
        }
        sibling = sibling.nextElementSibling;
    }

    return contents;
}

// 获取当前层级的所有按钮元素
function getCurrentLevelButtons(buttonElement) {
    const parentTab = buttonElement.closest('.tab');
    return Array.from(parentTab.querySelectorAll('.tablinks'));
}


document.addEventListener('DOMContentLoaded', async () => {
    console.log("file.js");

    fetchProtocol3762Data().then(result => {
        console.log("第一步完成:", result);
        const container = document.getElementById('tab-container');
        generateTabs(result, container);
    })
        .catch(error => {
            console.error("处理链中出错:", error);
        });

    console.log("exit file.js");
});

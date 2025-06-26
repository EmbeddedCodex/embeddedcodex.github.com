// self.onmessage = function (event) {
//     const { file, logType } = event.data;
//     const reader = new FileReader();
//     reader.readAsArrayBuffer(file);

//     reader.onload = function (event) {
//         const arrayBuffer = event.target.result;
//         const result = parseLogFile(arrayBuffer, logType);
//         // self.postMessage({ result });
//         console.log(result);

//         // 将结果分段发送到主线程
//         const chunkSize = 20 * 1024; // 每次发送的数据量
//         let index = 0;

//         const sendNextChunk = () => {
//             const chunk = result.slice(index, index + chunkSize);
//             self.postMessage({ chunk });

//             index += chunkSize;
//             if (index < result.length) {
//                 // 使用 setTimeout 来分段发送，避免阻塞主线程
//                 setTimeout(sendNextChunk, 0);
//             } else {
//                 self.postMessage({ done: true }); // 通知主线程数据发送完成
//             }
//         };

//         self.postMessage({ start: true }); // 通知主线程数据发送开始
//         sendNextChunk();
//     };

//     reader.onerror = function (event) {
//         self.postMessage({ error: '读取文件失败' });
//     };
// };

// 解析后的数据
const allGroups = [];
// 当前显示的数据组和页面
let currentGroupIndex = 0;
let currentPage = 1;
const rowsPerPage = 100;
let filteredData = [];

function parseLogFile(arrayBuffer, logType) {
    let result = '';

    if (logType === 'machine-log') {
        result = analyzeMachineLog(arrayBuffer);
    } else if (logType === 'module-log-cco') {
        result = analyzeModuleLogCCO(arrayBuffer);
    } else if (logType === 'module-log-sta') {
        result = analyzeModuleLogSTA(arrayBuffer);
    }

    return result;
}

function analyzeMachineLog(arrayBuffer) {
    // 示例：简单解析机台日志
    const bytes = new Uint8Array(arrayBuffer);
    // 示例：简单解析机台日志
    const decoder = new TextDecoder('GB2312');
    const text = decoder.decode(bytes);


    // 深化应用
    // 定义测试项及其对应的正则表达式
    const testItems = [
        '台区户变关系识别',
        '相位识别',
        '停电上报',
        '精准对时',
        '资产管理',
        '万年历同步',
        '负荷曲线采集与存储'
    ];

    const testFunctions = {
        '台区户变关系识别': analyzeFeederTransformerRelationship,
        '相位识别': analyzePhaseIdentification,
        '停电上报': analyzePowerOutageReporting,
        '精准对时': analyzePreciseTiming,
        '资产管理': analyzeAssetManagement,
        '万年历同步': analyzePerpetualCalendarSync,
        '负荷曲线采集与存储': analyzeLoadCurveCollection
    };

    // 创建一个对象来存储每个测试项的内容
    const testResults = {};

    // 遍历每个测试项，提取其内容
    testItems.forEach((item) => {

        const startMarker = `********${item}测试开始********`;
        const endMarker = `********${item}测试结束********`;

        // 转义特殊字符
        const escapedStartMarker = startMarker.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const escapedEndMarker = endMarker.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

        const regex = new RegExp(`(?<=${escapedStartMarker})(.*?)(?=${escapedEndMarker})`, 'gms');

        const matches = text.match(regex);

        if (matches) {
            // testResults[item] = matches.map((match) => match.trim());
            // 遍历 matches 数组
            testResults[item] = matches.flatMap((match) => {
                // 检查 match 是否包含 escapedStartMarker
                if (match.includes(startMarker)) {
                    // 如果包含，按 escapedStartMarker 分段
                    return match.split(startMarker).map((segment) => segment.trim());
                } else {
                    // 如果不包含，直接返回去除空白的 match
                    return [match.trim()];
                }
            });
        } else {
            testResults[item] = [];
        }
    });

    // 打印结果
    for (const [item, results] of Object.entries(testResults)) {
        console.log(`${item}测试结果：`);
        if (results.length > 0) {
            results.forEach((result, index) => {
                console.log(`第${index + 1}次测试：`);
                // console.log(result);
                let summary = result.slice(0, 100) + (result.length > 100 ? "..." : "");
                console.log(summary);
                console.log(`总长度: ${result.length}`);
                console.log('--------------------------');
            });
        } else {
            console.log('未找到该测试项的内容');
        }
    }

    // 循环调用每个测试项目的处理函数
    testItems.forEach((item) => {
        if (testFunctions[item] && testResults[item]) {
            testFunctions[item](testResults[item]);
        } else {
            console.warn(`未找到处理函数或日志数据：${item}`);
        }
    });
    // return text.split('\n').map(line => `${line}`).join('\n');
}

function analyzeModuleLogCCO(arrayBuffer) {
    const bytes = new Uint8Array(arrayBuffer);
    // 示例：简单解析模块日志 (txt)
    const decoder = new TextDecoder('utf-8');
    const text = decoder.decode(bytes);

    // 开始解析数据
    let match;
    const regex = /\[(.*?) \| +(\d+)\| *([A-F0-9]+|Tx|Rx)\](.*)/g;
    const allResults = []; // 用于存储所有分段的数据
    let currentSegment = []; // 当前段落的数据

    while ((match = regex.exec(text)) !== null) {
        const [fullMatch, time, milliseconds, dataType, rawData] = match;
        const parsedData = {
            time: time.trim(),
            milliseconds: parseInt(milliseconds.trim(), 10),
            dataType: dataType.trim(),
            rawData: rawData.trim()
        };

        // 如果 dataType 是 "1000"，表示新的一段数据
        if (dataType === "1000") {
            // 如果当前段落不为空，保存到 allResults 中
            if (currentSegment.length > 0) {
                allResults.push(currentSegment);
                allGroups.push(currentSegment);
                currentSegment = []; // 开始新的段落
            }
        }

        // 将当前解析的数据添加到当前段落
        currentSegment.push(parsedData);
    }
    // 不要忘记保存最后一段数据
    if (currentSegment.length > 0) {
        allResults.push(currentSegment);
        allGroups.push(currentSegment);
    }

    console.log(allResults);

    update();





    return text.split('\n').map(line => `${line}`).join('\n');
}

function analyzeModuleLogSTA(arrayBuffer) {
    const bytes = new Uint8Array(arrayBuffer);
    // 示例：简单解析模块日志 (bin)
    return Array.from(bytes).map(byte => byte.toString(16).padStart(2, '0')).join(' ');
}



// 定义测试项目的处理函数
function analyzeFeederTransformerRelationship(log) {
    // 处理“台区户变关系识别”的逻辑
    console.log("处理台区户变关系识别的逻辑");
    // 示例：提取和处理相关数据
    // const results = log.match(/相关的正则表达式/g);
    // return results;
    log.forEach((result, index) => {
        console.log(`第${index + 1}次测试：`);
        // console.log(result);
        let summary = result.slice(0, 100) + (result.length > 100 ? "..." : "");
        console.log(summary);
        console.log(`总长度: ${result.length}`);
        console.log('--------------------------');
    });
}

function analyzePhaseIdentification(log) {
    // 处理“相位识别”的逻辑
    console.log("处理相位识别的逻辑");
    // 示例：提取和处理相关数据
    // const results = log.match(/相关的正则表达式/g);
    // return results;
}

function analyzePowerOutageReporting(log) {
    // 处理“停电上报”的逻辑
    console.log("处理停电上报的逻辑");
    // 示例：提取和处理相关数据
    // const results = log.match(/相关的正则表达式/g);
    // return results;
}

function analyzePreciseTiming(log) {
    // 处理“精准对时”的逻辑
    console.log("处理精准对时的逻辑");
    // 示例：提取和处理相关数据
    // const results = log.match(/相关的正则表达式/g);
    // return results;
}

function analyzeAssetManagement(log) {
    // 处理“资产管理”的逻辑
    console.log("处理资产管理的逻辑");
    // 示例：提取和处理相关数据
    // const results = log.match(/相关的正则表达式/g);
    // return results;
}

function analyzePerpetualCalendarSync(log) {
    // 处理“万年历同步”的逻辑
    console.log("处理万年历同步的逻辑");
    // 示例：提取和处理相关数据
    // const results = log.match(/相关的正则表达式/g);
    // return results;
}

function analyzeLoadCurveCollection(log) {
    // 处理“负荷曲线采集与存储”的逻辑
    console.log("处理负荷曲线采集与存储的逻辑");
    // 示例：提取和处理相关数据
    // const results = log.match(/相关的正则表达式/g);
    // return results;
    log.forEach((result, index) => {
        console.log(`第${index + 1}次测试：`);
        // console.log(result);
        let summary = result.slice(0, 100) + (result.length > 100 ? "..." : "");
        console.log(summary);
        console.log(`总长度: ${result.length}`);
        console.log('--------------------------');
    });
}

// 更新
function update() {
    renderGroupTabs();
    renderTable();
    renderPagination();

    // 事件监听
    document.getElementById('searchBtn').addEventListener('click', filterData);
    document.getElementById('searchInput').addEventListener('keyup', function (e) {
        if (e.key === 'Enter') filterData();
    });
}

// 渲染组标签
function renderGroupTabs() {
    const tabsContainer = document.getElementById('groupTabs');
    tabsContainer.innerHTML = '';

    allGroups.forEach((group, index) => {
        const tab = document.createElement('div');
        tab.className = `group-tab ${index === currentGroupIndex ? 'active' : ''}`;
        tab.textContent = `组 ${index + 1} (${group.length}条)`;
        tab.addEventListener('click', () => {
            currentGroupIndex = index;
            currentPage = 1;
            renderGroupTabs();
            renderTable();
            renderPagination();
        });
        tabsContainer.appendChild(tab);
    });
}

// 过滤数据
function filterData() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const filterColumn = document.getElementById('filterColumn').value;
    const currentGroup = allGroups[currentGroupIndex];

    if (!searchTerm) {
        filteredData = currentGroup;
    } else {
        filteredData = currentGroup.filter(row => {
            if (filterColumn === 'all') {
                return row.some(cell => cell.toString().toLowerCase().includes(searchTerm));
            } else {
                const colIndex = parseInt(filterColumn);
                return row[colIndex].toString().toLowerCase().includes(searchTerm);
            }
        });
    }

    currentPage = 1;
    renderTable();
    renderPagination();
}

// 渲染表格 (使用虚拟滚动优化)
function renderTable() {
    const tableBody = document.getElementById('tableBody');
    const currentGroup = filteredData.length > 0 ? filteredData : allGroups[currentGroupIndex];
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, currentGroup.length);

    // 清空表格
    tableBody.innerHTML = '';

    // 只渲染当前页的数据
    for (let i = startIndex; i < endIndex; i++) {
        const row = currentGroup[i];
        const tr = document.createElement('tr');

        Object.keys(row).forEach(key => {
            const td = document.createElement('td');
            td.textContent = row[key];
            tr.appendChild(td);
        });

        tableBody.appendChild(tr);
    }
}


// 渲染分页
function renderPagination() {
    const pagination = document.getElementById('pagination');
    const currentGroup = filteredData.length > 0 ? filteredData : allGroups[currentGroupIndex];
    const totalPages = Math.ceil(currentGroup.length / rowsPerPage);

    pagination.innerHTML = '';

    // 上一页按钮
    const prevBtn = document.createElement('button');
    prevBtn.textContent = '上一页';
    prevBtn.disabled = currentPage === 1;
    prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderTable();
            renderPagination();
        }
    });
    pagination.appendChild(prevBtn);

    // 页码按钮
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    if (startPage > 1) {
        const firstBtn = document.createElement('button');
        firstBtn.textContent = '1';
        firstBtn.addEventListener('click', () => {
            currentPage = 1;
            renderTable();
            renderPagination();
        });
        pagination.appendChild(firstBtn);

        if (startPage > 2) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            pagination.appendChild(ellipsis);
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i;
        pageBtn.className = i === currentPage ? 'active' : '';
        pageBtn.addEventListener('click', () => {
            currentPage = i;
            renderTable();
            renderPagination();
        });
        pagination.appendChild(pageBtn);
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            pagination.appendChild(ellipsis);
        }

        const lastBtn = document.createElement('button');
        lastBtn.textContent = totalPages;
        lastBtn.addEventListener('click', () => {
            currentPage = totalPages;
            renderTable();
            renderPagination();
        });
        pagination.appendChild(lastBtn);
    }

    // 下一页按钮
    const nextBtn = document.createElement('button');
    nextBtn.textContent = '下一页';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderTable();
            renderPagination();
        }
    });
    pagination.appendChild(nextBtn);

    // 显示总数
    const info = document.createElement('span');
    info.textContent = `共 ${currentGroup.length} 条数据`;
    pagination.appendChild(info);
} 

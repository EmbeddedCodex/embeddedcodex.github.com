// 解析后的数据
const allGroups = [];
// 当前显示的数据组和页面
let currentGroupIndex = 0;
let currentPage = 1;
const rowsPerPage = 100;
let filteredData = [];

let typeChart, timeChart;

// 加载日志定义 (通过fetch从服务器获取)
let logDefinitions;

function analyzeModuleLogCCO(arrayBuffer) {
    const bytes = new Uint8Array(arrayBuffer);
    // 示例：简单解析模块日志 (txt)
    const decoder = new TextDecoder('utf-8');
    const text = decoder.decode(bytes);

    // 开始解析数据
    let match;
    const regex = /\[(.*?) \| +(\d+)\| *([A-F0-9]+|Tx|Rx)\](.*)/g;
    allGroups.length = 0; // 将数组长度设置为0，从而清空数组
    let currentSegment = []; // 当前段落的数据

    while ((match = regex.exec(text)) !== null) {
        const [fullMatch, time, milliseconds, dataType, rawData] = match;

        // 如果 dataType 是 "1000"，表示新的一段数据
        if (dataType === "1000") {
            // 如果当前段落不为空，保存到 allGroups 中
            if (currentSegment.length > 0) {
                allGroups.push(currentSegment);
                currentSegment = []; // 开始新的段落
            }
        }

        // 将当前解析的数据添加到当前段落
        currentSegment.push([
            time.trim(),
            parseInt(milliseconds.trim(), 10),
            dataType.trim(),
            rawData.trim()
        ]);
    }
    // 不要忘记保存最后一段数据
    if (currentSegment.length > 0) {
        allGroups.push(currentSegment);
    }

    console.log(allGroups);

    // 更新
    renderGroupTabs();
    renderDashboard();
    renderTable();
    renderPagination();

    // 事件监听
    document.getElementById('searchBtn').addEventListener('click', filterData);
    document.getElementById('searchInput').addEventListener('keyup', function (e) {
        if (e.key === 'Enter') filterData();
    });

    // return text.split('\n').map(line => `${line}`).join('\n');
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
            renderDashboard();
            renderTable();
            renderPagination();
        });
        tabsContainer.appendChild(tab);
    });
}

// 过滤数据
function filterData() {
    const searchInput = document.getElementById('searchInput').value.toLowerCase();
    const searchTerms = searchInput.split(',')
        .map(term => term.trim()) // 去除每个关键词前后的空格
        .filter(term => term !== ''); // 去除空字符串
    const filterColumn = document.getElementById('filterColumn').value;
    const currentGroup = allGroups[currentGroupIndex];

    if (!searchTerms) {
        filteredData = currentGroup; // 如果没有搜索词，返回所有数据
    } else {
        filteredData = currentGroup.filter(row => {
            if (filterColumn === 'all') {
                // 搜索所有列
                return searchTerms.some(term => {
                    return row.some(cell => cell.toString().toLowerCase().includes(term));
                })
            } else {
                // 搜索特定列
                const colIndex = parseInt(filterColumn);
                return searchTerms.some(term => {
                    return row[colIndex].toString().toLowerCase().includes(term);
                })
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

        // 为每一行添加点击事件监听器
        tr.addEventListener('click', () => {
            // 获取被点击行的数据
            const rowData = currentGroup[i];
            const protocolSection = document.getElementById('protocolSection');
            const parseResult = document.getElementById('parse-result');
            parseResult.innerHTML = '';

            console.log('Clicked row data:', rowData);
            parseLogCCO(convertToHex(rowData[2]), rowData[3], addToParseResult);

            protocolSection.style.display = 'block'; // 显示解析结果部分
        });

        row.forEach(cell => {
            const td = document.createElement('td');
            td.textContent = cell;
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

function renderDashboard() {
    const currentGroup = allGroups[currentGroupIndex];

    // 统计类型分布
    const typeCounts = {};
    currentGroup.forEach(row => {
        const type = row[2];
        typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    // 统计时间分布 (按小时)
    const timeCounts = Array(24).fill(0);
    currentGroup.forEach(row => {
        const date = convertToUTC(row[0]);
        const hour = date.getHours();
        timeCounts[hour]++;
    });

    // 渲染图表
    renderTypeChart(typeCounts);
    renderTimeChart(timeCounts);

    // 渲染统计信息
    renderStats(currentGroup);

    // 渲染抽样数据
    renderSampleData(currentGroup);
}

function renderTypeChart(typeCounts) {
    const ctx = document.getElementById('typeChart').getContext('2d');
    const labels = Object.keys(typeCounts);
    const data = Object.values(typeCounts);

    if (typeChart) {
        typeChart.destroy();
    }

    typeChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    '#4CAF50',
                    '#2196F3',
                    '#FFC107',
                    '#FF5722',
                    '#9C27B0'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

function renderTimeChart(timeCounts) {
    const ctx = document.getElementById('timeChart').getContext('2d');
    const labels = Array.from({ length: 24 }, (_, i) => `${i}:00`);

    if (timeChart) {
        timeChart.destroy();
    }

    timeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '数据量',
                data: timeCounts,
                backgroundColor: '#4CAF50'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function renderStats(data) {
    const statsGrid = document.getElementById('statsGrid');
    statsGrid.innerHTML = '';

    // 计算各种统计信息
    const millis = data.map(row => convertToUTC(row[0]).getTime());
    // const minTime = Math.min(...millis);
    let minTime = Infinity;
    for (const num of millis) {
        if (num < minTime) minTime = num;
    }
    // const maxTime = Math.max(...millis);
    let maxTime = -Infinity; // 初始值设为负无穷
    for (const num of millis) {
        if (num > maxTime) maxTime = num;
    }
    const avgTime = millis.reduce((a, b) => a + b, 0) / millis.length;

    const types = [...new Set(data.map(row => row[2]))];

    // 添加统计项
    addStatItem('总数据量', data.length);
    addStatItem('最早时间', new Date(minTime).toLocaleString());
    addStatItem('最晚时间', new Date(maxTime).toLocaleString());
    addStatItem('平均时间', new Date(avgTime).toLocaleString());
    addStatItem('类型数量', types.length);
    addStatItem('数据密度', `${(data.length / ((maxTime - minTime) / 1000)).toFixed(2)}条/秒`);
    addStatItem('时间跨度', `${((maxTime - minTime) / (1000 * 60 * 60)).toFixed(2)}小时`);
    addStatItem('最大类型', Object.entries(
        data.reduce((acc, row) => {
            acc[row[2]] = (acc[row[2]] || 0) + 1;
            return acc;
        }, {})
    ).sort((a, b) => b[1] - a[1])[0][0]);
}

function addStatItem(label, value) {
    const statsGrid = document.getElementById('statsGrid');
    const item = document.createElement('div');
    item.className = 'stat-item';
    item.innerHTML = `<div>${label}</div><div class="stat-value">${value}</div>`;
    statsGrid.appendChild(item);
}

function renderSampleData(data) {
    const sampleContainer = document.getElementById('sampleData');
    sampleContainer.innerHTML = '';

    const sampleSize = Math.min(50, data.length);
    for (let i = 0; i < sampleSize; i++) {
        const row = data[i];
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid #eee';

        [row[0], row[1], row[2], row[3]].forEach(cell => {
            const td = document.createElement('td');
            td.style.padding = '8px';
            td.textContent = cell;
            tr.appendChild(td);
        });

        sampleContainer.appendChild(tr);
    }
}

/**
 * 将自定义格式的日期时间字符串转换为 UTC 时间
 * @param {string} dateString - 日期时间字符串，格式为 "YYYY-MM-DD HH:MM:SS 000"
 * @returns {string} - 转换后的 UTC 时间，格式为 ISO 8601
 */
function convertToUTC(dateString) {
    // 解析字符串
    const [datePart, timePart, millisecondPart] = dateString.split(' ');
    const [year, month, day] = datePart.split('-');
    const [hours, minutes, seconds] = timePart.split(':');
    const milliseconds = millisecondPart.trim() || '000';

    // 创建 Date 对象
    const date = new Date(Date.UTC(year, month - 1, day, hours - 8, minutes, seconds, milliseconds));

    // 原始字符串：2025-06-11 01:44:26 000
    // console.log(date); // 输出解析后的日期对象 Wed Jun 11 2025 01:44:26 GMT+0800 (中国标准时间)
    // console.log(date.toISOString()); // 输出 ISO 8601 格式的日期字符串 2025-06-10T17:44:26.000Z
    // console.log(date.toLocaleString()); // 输出本地时间格式 2025/6/11 01:44:26

    // 转换为 ISO 8601 格式的 UTC 时间
    // return date.toISOString();
    return date;
}

// 创建 data-item 元素
function createDataItem(header, content) {
    const dataItem = document.createElement('div');
    dataItem.classList.add('data-item');

    const dataItemHeader = document.createElement('div');
    dataItemHeader.classList.add('data-item-header');
    dataItemHeader.textContent = header;
    dataItem.appendChild(dataItemHeader);

    const dataItemContent = document.createElement('div');
    dataItemContent.textContent = content;
    dataItem.appendChild(dataItemContent);

    return dataItem;
}

// 将 data-item 添加到 parse-result
function addToParseResult(header, content) {
    const parseResult = document.getElementById('parse-result');
    const dataItem = createDataItem(header, content);
    parseResult.appendChild(dataItem);
}

async function loadLogDefinitions(url) {
    try {
        const response = await fetch(url);
        logDefinitions = await response.json();
    } catch (e) {
        console.error("加载日志定义失败:", e);
    }
}

/**
 * 将十六进制字符串转换为带有 0x 前缀的 4 字节十六进制字符串
 * @param {string} hexString - 十六进制字符串（不带 0x 前缀）
 * @returns {string} - 带有 0x 前缀的 4 字节十六进制字符串
 */
function convertToHex(hexString) {
    // 确保输入是有效的十六进制字符串
    if (!/^[0-9A-Fa-f]+$/.test(hexString)) {
        throw new Error('Invalid hexadecimal string');
    }

    // 使用 parseInt 将十六进制字符串转换为数字
    const hexNumber = parseInt(hexString, 16);

    // 将数字转换为带有 0x 前缀的 4 字节十六进制字符串
    const formattedHex = hexNumber.toString(16).padStart(4, '0').toLowerCase();

    return `0x${formattedHex}`;
}

// 解析多字节值(考虑字节序)
function parseMultiByte(data, offset, size, endian = 'big') {
    // 创建一个 DataView 来处理字节数据
    const dataView = new DataView(new Uint8Array(data).buffer, offset, size);

    // 根据大小端模式读取值
    if (size === 4) {
        return dataView.getUint32(0, endian === 'little');
    } else if (size === 2) {
        return dataView.getUint16(0, endian === 'little');
    } else if (size === 1) {
        return dataView.getUint8(0);
    } else {
        throw new Error('Unsupported size');
    }
}

// 显示值格式化
function formatValue(value, field) {
    let result = '';
    const rawValue = value;

    // 应用缩放因子
    if (field.scale) {
        value *= field.scale;
    }

    // 枚举映射
    if (field.enum && field.enum[rawValue.toString()] !== undefined) {
        value = field.enum[rawValue.toString()];
    }

    // 根据显示设置格式化
    switch (field.display) {
        case 'hex':
            if (field.type.includes('int') || field.type.includes('uint')) {
                result = `0x${rawValue.toString(16).toUpperCase()}`;
            } else {
                result = value;
            }
            break;

        case 'both':
            if (field.type.includes('int') || field.type.includes('uint')) {
                result = `${value} (0x${rawValue.toString(16).toUpperCase()})`;
            } else {
                result = value;
            }
            break;

        default: // 'dec' or undefined
            result = value;
    }

    // 添加单位
    if (field.unit) {
        result += ` ${field.unit}`;
    }

    return result;
}

// 解析日志函数
function parseLogCCO(logId, rawDataInput, cb) {
    // 验证输入
    if (!logId || !rawDataInput) {
        alert("请输入日志ID和原始数据");
        return;
    }

    // 转换原始数据为字节数组
    let rawData;
    try {
        // 处理逗号或空格分隔的hex数据
        const hexStr = rawDataInput.replace(/0x/g, '').replace(/,/g, ' ').replace(/\s+/g, ' ');
        const hexArray = hexStr.split(' ').filter(x => x.length > 0);
        rawData = hexArray.map(x => parseInt(x, 16));

        if (rawData.some(isNaN)) {
            throw new Error("包含非十六进制数据");
        }
    } catch (e) {
        alert("原始数据格式错误: " + e.message);
        return;
    }

    // 查找日志定义
    const logDef = logDefinitions.log_definitions[logId];
    if (!logDef) {
        alert("未找到日志ID " + logId + " 的定义");
        return;
    }

    // 处理变长日志
    let variantDef = logDef;
    if (logDef.variants) {
        const headerByte = rawData[0].toString(16);
        variantDef = logDef.variants.find(v => v.header === '0x' + headerByte);
        if (!variantDef) {
            alert("未找到匹配的日志变体");
            return;
        }

        if (rawData.length !== variantDef.length) {
            alert(`日志长度不匹配，预期 ${variantDef.length} 字节，实际 ${rawData.length} 字节`);
            return;
        }
    }

    // 解析各字段
    variantDef.fields.forEach(field => {
        try {
            let value;
            let rawValue = '';

            // 根据字段类型解析
            switch (field.type) {
                case 'BIN':
                    value = parseMultiByte(rawData, field.offset, field.size, field.endian || 'big');
                    rawValue = toUpperCaseHex(value, field.size * 2);

                case 'string':
                    value = '';
                    for (let i = 0; i < field.length; i++) {
                        const charCode = rawData[field.offset + i];
                        if (charCode === 0) break;
                        value += String.fromCharCode(charCode);
                        rawValue += `0x${charCode.toString(16).padStart(2, '0').toUpperCase()} `;
                    }
                    rawValue = rawValue.trim();
                    break;

                case 'bitfield':
                    const byteValue = rawData[field.offset];
                    rawValue = `0x${byteValue.toString(16).padStart(2, '0').toUpperCase()}`;

                    value = [];
                    field.bits.forEach(bit => {
                        const bitValue = (byteValue & (1 << bit.bit)) !== 0;
                        value.push(`${bit.name}: ${bitValue ? '是' : '否'}`);
                    });
                    value = value.join(', ');
                    break;

                default:
                    value = "未知类型";
                    rawValue = "N/A";
            }

            // valueCell.textContent = Array.isArray(value) ? value.join(', ') : value;
            // rawCell.textContent = rawValue;

            cb(field.name, rawValue);

        } catch (e) {
            cb("解析错误", "N/A");
            console.error(`解析字段 ${field.name} 时出错:`, e);
        }
    });
}

/**
 * 将数字转换为指定长度的十六进制字符串（大写）
 * @param {number} value - 要转换的数字
 * @param {number} [length=2] - 十六进制字符串的长度，默认为 2
 * @returns {string} - 指定长度的十六进制字符串（大写）
 */
function toUpperCaseHex(value, length = 2) {
    return value.toString(16).padStart(length, '0').toUpperCase();
}

// 模块加载时自动执行初始化代码
(function () {
    console.log('CcoLog 模块加载完成');
    loadLogDefinitions('./log_definitions.json');
})();

// 暴露处理函数
export { analyzeModuleLogCCO };

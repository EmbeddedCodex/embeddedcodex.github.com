// 解析后的数据
const allGroups = [];
// 当前显示的数据组和页面
let currentGroupIndex = 0;
let currentPage = 1;
const rowsPerPage = 100;
let filteredData = [];

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
        currentSegment.push([
            time.trim(),
            parseInt(milliseconds.trim(), 10),
            dataType.trim(),
            rawData.trim()
        ]);
    }
    // 不要忘记保存最后一段数据
    if (currentSegment.length > 0) {
        allResults.push(currentSegment);
        allGroups.push(currentSegment);
    }

    console.log(allResults);

    // 更新
    renderGroupTabs();
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

// 暴露处理函数
export { analyzeModuleLogCCO };

// 376.2 协议解析函数
function parseHex_3762() {
    const input = document.getElementById('hexInput_3762').value;
    const resultDiv = document.getElementById('result_3762');

    if (!/^[0-9A-Fa-f ]+$/.test(input)) {
        resultDiv.innerHTML = "输入无效，请输入有效的十六进制字符串。";
        return;
    }

    let bytes = [];
    let hexArray = input.trim().split(' ');
    for (let hex of hexArray) {
        if (hex.length === 2) {
            const byte = parseInt(hex, 16);
            bytes.push(byte);
        } else {
            resultDiv.innerHTML += `无效的十六进制数: ${hex}<br>`;
            return;
        }
    }

    const frame_len = bytes[1] + bytes[2] * 256;

    let frame_cs = 0;
    for (let i = 3; i < frame_len - 2; i++) {
        frame_cs += bytes[i];
    }
    frame_cs &= 0xFF;

    // 清空之前的内容
    resultDiv.innerHTML = '';

    // 创建结果字符串容器
    let gelement = document.createElement('p');
    gelement.classList.add('result');
    gelement.innerHTML = '解析结果: ';
    resultDiv.appendChild(gelement);

    // 1. 起始
    {
        let element = document.createElement('p');
        element.classList.add('header');
        element.textContent = '起始：' + hexArray[0] + 'H';
        resultDiv.appendChild(element);

        const data = bytes.slice(0, 1).map(function (num) { return num.toString(16).padStart(2, '0').toUpperCase() }).join(' ');
        gelement.innerHTML += '<span class="header">' + data + '</span> ';
    }

    // 2. 长度 L
    {
        let element = document.createElement('p');
        element.classList.add('length');
        element.textContent = '长度：' + frame_len;
        resultDiv.appendChild(element);

        const data = bytes.slice(1, 3).map(function (num) { return num.toString(16).padStart(2, '0').toUpperCase() }).join(' ');
        gelement.innerHTML += '<span class="length">' + data + '</span> ';

        if (frame_len != bytes.length) {
            element.textContent = '报文缺失：' + frame_len + ' vs ' + bytes.length;
            resultDiv.appendChild(element);
            return;
        }
    }

    // 3. 控制域 C
    const frame_C = bytes[3];
    {
        let element = document.createElement('p');
        element.classList.add('control');
        element.textContent = '控制域：' + frame_C.toString(16).padStart(2, '0').toUpperCase() + 'H';
        resultDiv.appendChild(element);

        const data = bytes.slice(3, 4).map(function (num) { return num.toString(16).padStart(2, '0').toUpperCase() }).join(' ');
        gelement.innerHTML += '<span class="control">' + data + '</span> ';

        // 创建表格元素
        let table = document.createElement('table');

        // 创建表头行
        let thead = document.createElement('thead');
        let headerRow = document.createElement('tr');
        let headers = ['D7', 'D6', 'D5', 'D4-D3', 'D2-D0'];
        headers.forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // 创建第二行，用于显示参数名称
        let tbody = document.createElement('tbody');
        let paramRow = document.createElement('tr');
        let params = ['传输方向位 DIR', '启动标志位 PRM', '地址域标识 ADD', '协议版本号 VER', '保留'];
        params.forEach(paramText => {
            const td = document.createElement('td');
            td.textContent = paramText;
            paramRow.appendChild(td);
        });
        tbody.appendChild(paramRow);

        // 创建第三行，用于解析参数
        let explanationRow = document.createElement('tr');
        let explanations = [];
        if (frame_C & 0x80) {
            explanations.push('上行方向')
        } else {
            explanations.push('下行方向')
        }
        if (frame_C & 0x40) {
            explanations.push('来自启动站')
        } else {
            explanations.push('来自从动站')
        }
        if (frame_C & 0x20) {
            explanations.push('带地址域')
        } else {
            explanations.push('不带地址域')
        }
        explanations.push(((frame_C >> 2) & 0b11).toString(16))
        explanations.push(((frame_C >> 0) & 0b11).toString(16))

        explanations.forEach(explanation => {
            const td = document.createElement('td');
            td.textContent = explanation;
            explanationRow.appendChild(td);
        });
        tbody.appendChild(explanationRow);

        // 将表体添加到表格
        table.appendChild(tbody);

        // 将表格添加到容器中
        resultDiv.appendChild(table);
    }

    // 4. 用户数据
    {
        let user_data = bytes.slice(4, frame_len - 2);
        let element = document.createElement('p');
        element.classList.add('data');
        element.textContent = '用户数据：' + user_data.map(function (num) {
            return num.toString(16).padStart(2, '0').toUpperCase();
        }).join(' ');
        resultDiv.appendChild(element);

        const data = bytes.slice(4, frame_len - 2).map(function (num) { return num.toString(16).padStart(2, '0').toUpperCase() }).join(' ');
        gelement.innerHTML += '<span class="data">' + data + '</span> ';

        // 创建表格元素
        let table = document.createElement('table');
        let tbody = document.createElement('tbody');

        // 地址域 A
        {
            let paramRow = document.createElement('tr');
            let explanations = ['地址域 A'];
            if (frame_C & 0x20) {
                const ASRC = user_data.slice(0, 0 + 6).map(function (num) {
                    return num.toString(16).padStart(2, '0').toUpperCase();
                }).join(' ');
                const ADST = user_data.slice(6, 6 + 6).map(function (num) {
                    return num.toString(16).padStart(2, '0').toUpperCase();
                }).join(' ');

                explanations.push(ASRC + ';\n' + ADST);
                user_data = user_data.slice(6 * 2,);
            } else {
                explanations.push('不带地址域')
            }
            explanations.forEach(explanation => {
                const td = document.createElement('td');
                td.textContent = explanation;
                paramRow.appendChild(td);
            });
            tbody.appendChild(paramRow);
        }

        // 应用功能码 AFN
        {
            let paramRow = document.createElement('tr');
            let explanations = ['应用功能码 AFN'];
            {
                const AFN = user_data[0].toString(16).padStart(2, '0').toUpperCase() + 'H';
                explanations.push(AFN);
                user_data = user_data.slice(1,);
            }
            explanations.forEach(explanation => {
                const td = document.createElement('td');
                td.textContent = explanation;
                paramRow.appendChild(td);
            });
            tbody.appendChild(paramRow);
        }

        // 帧序列域 SEQ
        {
            let paramRow = document.createElement('tr');
            let explanations = ['帧序列域 SEQ'];
            {
                const SEQ = user_data[0].toString(16).padStart(2, '0').toUpperCase() + 'H(' + user_data[0].toString(10) + ')';
                explanations.push(SEQ);
                user_data = user_data.slice(1,);
            }
            explanations.forEach(explanation => {
                const td = document.createElement('td');
                td.textContent = explanation;
                paramRow.appendChild(td);
            });
            tbody.appendChild(paramRow);
        }

        // 数据识别编码 DI
        {
            let paramRow = document.createElement('tr');
            let explanations = ['数据识别编码 DI'];
            {
                const DI = user_data.slice(0, 4).map(function (num) {
                    return num.toString(16).padStart(2, '0').toUpperCase();
                }).join(' ');
                explanations.push(DI);
                user_data = user_data.slice(4,);
            }
            explanations.forEach(explanation => {
                const td = document.createElement('td');
                td.textContent = explanation;
                paramRow.appendChild(td);
            });
            tbody.appendChild(paramRow);
        }

        // 数据识别内容
        {
            let paramRow = document.createElement('tr');
            let explanations = ['数据识别内容'];
            {
                if (user_data.length > 0) {
                    const BIN = user_data.map(function (num) {
                        return num.toString(16).padStart(2, '0').toUpperCase();
                    }).join(' ');
                    explanations.push(BIN);
                } else {
                    explanations.push('无数据内容')
                }
            }
            explanations.forEach(explanation => {
                const td = document.createElement('td');
                td.textContent = explanation;
                paramRow.appendChild(td);
            });
            tbody.appendChild(paramRow);
        }

        // 将表体添加到表格
        table.appendChild(tbody);

        // 将表格添加到容器中
        resultDiv.appendChild(table);
    }

    // 5. 帧校验和
    {
        let element = document.createElement('p');
        element.classList.add('cs');
        element.textContent = '帧校验和：' + hexArray[frame_len - 2] + 'H';
        resultDiv.appendChild(element);

        const data = bytes.slice(frame_len - 2, frame_len - 2 + 1).map(function (num) { return num.toString(16).padStart(2, '0').toUpperCase() }).join(' ');
        gelement.innerHTML += '<span class="cs">' + data + '</span> ';

        if (bytes[frame_len - 2] != frame_cs) {
            element.textContent = '帧校验和：' + '错误：' + hexArray[frame_len - 2] + 'H, ' + '正确：' + frame_cs.toString(16).padStart(2, '0').toUpperCase() + 'H';
            resultDiv.appendChild(element);
        }
    }

    // 6. 结束
    {
        let element = document.createElement('p');
        element.classList.add('footer');
        element.textContent = '结束：' + hexArray[frame_len - 1] + 'H';
        resultDiv.appendChild(element);

        const data = bytes.slice(frame_len - 1, frame_len - 1 + 1).map(function (num) { return num.toString(16).padStart(2, '0').toUpperCase() }).join(' ');
        gelement.innerHTML += '<span class="footer">' + data + '</span> ';
    }
}

// 导出函数供其他文件使用（使用模块化）
// export { parseHex_3762 };

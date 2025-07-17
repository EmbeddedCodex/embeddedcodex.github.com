// 记录当前串口设备
let serialPort = null;
// 记录串口开关状态，初始为关闭状态
let isSerialOpen = false;

/**
 * 打开串口连接
 * @returns {Promise<void>} 一个Promise，在串口成功打开时resolve，失败时reject
 */
async function openSerialPort() {
    const btn = document.getElementById('connect-btn');

    const baudRate = document.getElementById('baud-rate').value;
    const dataBits = document.getElementById('data-bits').value;
    const parity = document.getElementById('parity').value;
    const stopBits = document.getElementById('stop-bits').value;

    let options = {
        baudRate: parseInt(baudRate),
        dataBits: parseInt(dataBits),
        parity: parity,
        stopBits: parseInt(stopBits),
        flowControl: 'none',
        bufferSize: 256,
        timeout: 1000,
        encoding: 'utf-8',
    }

    try {
        await serialPort.open(options);
        isSerialOpen = true;
        console.log('串口已成功打开');
        updateStatus(`已连接@ ${baudRate}bps`);
        btn.textContent = '断开连接';
        btn.classList.add('btn-danger');
    } catch (error) {
        console.error('打开串口时出错:', error);
        throw error;
    }
}

/**
 * 关闭串口连接
 * @returns {Promise<void>} 一个Promise，在串口成功关闭时resolve，失败时reject
 */
async function closeSerialPort() {
    const btn = document.getElementById('connect-btn');
    try {
        if (serialPort && isSerialOpen) {
            await serialPort.close();
            isSerialOpen = false;
            console.log('串口已成功关闭');
            btn.textContent = '连接串口';
            btn.classList.remove('btn-danger');
        }
    } catch (error) {
        console.error('关闭串口时出错:', error);
        throw error;
    }
}

// 更新状态栏
function updateStatus(message) {
    document.getElementById('status-bar').textContent = message;
}

navigator.serial.addEventListener("connect", (e) => {
    // Connect to `e.target` or add it to a list of available ports.
    console.log("连接串口事件触发");
});

navigator.serial.addEventListener("disconnect", (e) => {
    // Remove `e.target` from the list of available ports.
    console.log("断开串口事件触发");
});

navigator.serial.getPorts().then((ports) => {
    // Initialize the list of available ports with `ports` on page load.
    console.log("获取串口列表事件触发");
});

// 这里将实现所有功能逻辑
document.addEventListener('DOMContentLoaded', function () {
    if (!('serial' in navigator)) {
        alert('您的浏览器不支持WebSerial API');
        return;
    }

    // 标签切换功能
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');

            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            button.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    });

    // 连接串口按钮
    document.getElementById('connect-btn').addEventListener('click', function () {
        // if (this.textContent === '断开连接') {
        //     updateStatus(`已断开`);
        //     this.textContent = '连接串口';
        //     this.classList.remove('btn-danger');
        //     serialPort.close();
        //     return;
        // }

        console.log("连接串口按钮点击事件触发");

        // updateStatus(`正在连接 @ ${baudRate}bps...`);

        navigator.serial.requestPort().then((port) => {
            closeSerialPort()
            serialPort = port;
            // openSerialPort()




            // updateStatus(`已连接 ${serialPort} @ ${baudRate}bps`);
            // this.textContent = '断开连接';
            // this.classList.add('btn-danger');
            // port.open({
            //     baudRate: baudRate,
            //     dataBits: dataBits,
            //     parity: parity,
            //     stopBits: stopBits,
            // });
            // port.addEventListener('read', (e) => {
            //     console.log('读取数据:', e);
            // });
            // port.addEventListener('write', (e) => {
            //     console.log('写入数据:', e);
            // });
            // let data = "dfsdfsdf"
            // sendData(serialPort, data);
            // port.write(data);
        })
            .catch((e) => {
                // The user didn't select a port.
                console.log("选择端口时出错:", e);
            });


        // // 模拟连接过程
        // setTimeout(() => {
        //     updateStatus(`已连接 ${port} @ ${baudRate}bps`);
        //     this.textContent = '断开连接';
        //     this.classList.add('btn-danger');

        //     // 更改点击事件为断开连接
        //     this.onclick = function () {
        //         updateStatus(`已断开 ${port}`);
        //         this.textContent = '连接串口';
        //         this.classList.remove('btn-danger');
        //         this.onclick = arguments.callee; // 恢复原来的函数
        //     };
        // }, 1000);
    });

    // 组包按钮
    document.getElementById('build-frame-btn').addEventListener('click', function () {
        const protocol = document.getElementById('protocol-select').value;
        const frameType = document.getElementById('frame-type').value;
        const address = document.getElementById('address').value;
        const dataId = document.getElementById('data-identifier').value;
        const dataValue = document.getElementById('data-value').value;

        if (!address) {
            updateStatus('请输入设备地址');
            return;
        }

        let frame = '';

        // 模拟不同协议的组包
        if (protocol.includes('645')) {
            // DL/T645协议组包
            frame = build645Frame(address, frameType, dataId, dataValue);
        } else if (protocol.includes('698')) {
            // DL/T698协议组包
            frame = build698Frame(address, frameType, dataId, dataValue);
        } else if (protocol.includes('376')) {
            // DL/T376协议组包
            frame = build376Frame(address, frameType, dataId, dataValue);
        } else {
            frame = '自定义协议组包功能待实现';
        }

        document.getElementById('send-data').value = frame;
        updateStatus(`已生成 ${protocol} ${frameType} 帧`);
    });

    // 发送按钮
    document.getElementById('send-btn').addEventListener('click', function () {
        const data = document.getElementById('send-data').value.trim();

        if (!data) {
            updateStatus('请输入要发送的数据');
            return;
        }

        updateStatus(`发送: ${data}`);

        // 模拟接收数据
        setTimeout(() => {
            // 根据协议生成模拟响应
            const protocol = document.getElementById('protocol-select').value;
            let response = '';

            if (protocol.includes('645')) {
                response = simulate645Response(data);
            } else if (protocol.includes('698')) {
                response = simulate698Response(data);
            } else if (protocol.includes('376')) {
                response = simulate376Response(data);
            } else {
                response = '00 01 02 03 04 05 06 07 08 09 0A';
            }

            document.getElementById('receive-data').value = response;
            updateStatus(`收到响应: ${response}`);

            // 添加到历史记录
            addToHistory(data, response, protocol);
        }, 500);
    });

    // 解析按钮
    document.getElementById('parse-btn').addEventListener('click', function () {
        const data = document.getElementById('receive-data').value.trim();
        const protocol = document.getElementById('protocol-select').value;

        if (!data) {
            updateStatus('没有可解析的数据');
            return;
        }

        updateStatus(`正在解析 ${protocol} 数据...`);

        // 模拟解析过程
        setTimeout(() => {
            updateStatus(`已解析 ${protocol} 数据`);
            // 实际应用中这里会调用解析函数并显示结果
        }, 300);
    });

    // 清空按钮
    document.getElementById('clear-send-btn').addEventListener('click', function () {
        document.getElementById('send-data').value = '';
    });

    document.getElementById('clear-receive-btn').addEventListener('click', function () {
        document.getElementById('receive-data').value = '';
    });

    document.getElementById('clear-history-btn').addEventListener('click', function () {
        document.getElementById('history-list').innerHTML = '<p>历史记录已清空</p>';
    });



    // 添加到历史记录
    function addToHistory(sendData, receiveData, protocol) {
        const historyList = document.getElementById('history-list');
        const now = new Date();
        const timestamp = now.toLocaleString();

        const item = document.createElement('div');
        item.className = 'data-item';

        item.innerHTML = `
                    <div class="data-item-header">${timestamp} - ${protocol}</div>
                    <div>发送: ${sendData}</div>
                    <div>接收: ${receiveData}</div>
                `;

        historyList.insertBefore(item, historyList.firstChild);
    }

    // 以下是模拟协议组包和解析的函数
    function build645Frame(address, frameType, dataId, dataValue) {
        // 简化的DL/T645组包逻辑
        let frame = '68 ';

        // 地址域 (6字节)
        const addr = address.padStart(12, '0'); // 12位表号
        for (let i = 0; i < 6; i++) {
            frame += addr.substr(i * 2, 2) + ' ';
        }

        frame += '68 ';

        // 控制码
        if (frameType === 'read') {
            frame += '11 ';
        } else if (frameType === 'write') {
            frame += '14 ';
        } else if (frameType === 'broadcast') {
            frame += '08 ';
        }

        // 数据长度 (根据数据标识)
        frame += '04 '; // 假设固定4字节

        // 数据标识 (如9010F000 -> 90 10 F0 00)
        if (dataId && dataId.length >= 8) {
            for (let i = 0; i < 4; i++) {
                frame += dataId.substr(i * 2, 2) + ' ';
            }
        } else {
            frame += '33 33 33 33 '; // 默认数据
        }

        // 校验和 (简化为固定值)
        frame += 'XX ';

        // 结束符
        frame += '16';

        return frame;
    }

    function build698Frame(address, frameType, dataId, dataValue) {
        // 简化的DL/T698组包逻辑
        let frame = '68 ';

        // 长度 (暂时留空)
        frame += 'XX XX XX XX ';

        // 控制域
        frame += 'C0 ';

        // 地址域
        frame += '01 '; // 地址类型
        frame += '04 '; // 地址长度
        frame += address.substr(0, 8).match(/.{2}/g).join(' ') + ' ';

        // 帧序列
        frame += '00 ';

        // 服务标识
        if (frameType === 'read') {
            frame += '01 ';
        } else if (frameType === 'write') {
            frame += '04 ';
        }

        // 数据
        if (dataId) {
            frame += dataId.match(/.{2}/g).join(' ') + ' ';
        }

        if (dataValue) {
            frame += dataValue.match(/.{2}/g).join(' ') + ' ';
        }

        // 结束符
        frame += '16';

        return frame;
    }

    function build376Frame(address, frameType, dataId, dataValue) {
        // 简化的DL/T376组包逻辑
        let frame = '68 ';

        // 地址域
        frame += address.substr(0, 12).match(/.{2}/g).join(' ') + ' ';
        frame += '68 ';

        // 控制码
        if (frameType === 'read') {
            frame += '01 ';
        } else if (frameType === 'write') {
            frame += '04 ';
        }

        // 数据长度
        frame += 'XX ';

        // 数据标识
        if (dataId) {
            frame += dataId.match(/.{2}/g).join(' ') + ' ';
        }

        // 数据值
        if (dataValue) {
            frame += dataValue.match(/.{2}/g).join(' ') + ' ';
        }

        // 校验和
        frame += 'XX ';

        // 结束符
        frame += '16';

        return frame;
    }

    function simulate645Response(request) {
        // 简化的DL/T645响应模拟
        if (request.includes('11 04')) { // 读数据
            return '68 11 11 11 11 11 11 68 91 08 33 33 33 33 33 33 33 33 16';
        } else if (request.includes('14 04')) { // 写数据
            return '68 11 11 11 11 11 11 68 94 00 16';
        }
        return '68 11 11 11 11 11 11 68 91 08 90 10 F0 00 12 34 56 78 16';
    }

    function simulate698Response(request) {
        // 简化的DL/T698响应模拟
        return '68 0B 00 00 00 80 01 04 11 11 11 11 00 01 08 90 10 F0 00 12 34 56 78 16';
    }

    function simulate376Response(request) {
        // 简化的DL/T376响应模拟
        return '68 11 11 11 11 11 11 68 81 08 90 10 F0 00 12 34 56 78 XX 16';
    }
});

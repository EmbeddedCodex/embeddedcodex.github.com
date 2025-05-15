
async function generate_3762_frame() {
    const resultDiv = document.getElementById('generation_3762');

    resultDiv.innerHTML = ''; // 清空结果显示区域，避免重复显示旧结果

    const appendDiv = (info, data) => appendDetailSection(resultDiv, 'footer', `${info}`, `${data}`);

    let DI3 = 0xE8;
    let AFN = [0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07];

    let data = [];

    appendDiv(`通信双方类型标识`, `终端与本地模块通信（E8）`);
    appendDiv(`通信双方类型标识`, `采集器与本地模块通信（EA）`);
    appendDiv(`通信双方类型标识`, `终端与USB功能模块通信（EC）`);

    for (let i = 0; i < AFN.length; i++) {
        const file_func = `${formatByte(DI3)}_${formatByte(AFN[i])}`; // 构造文件名
        const file_path = `json/3762/${file_func}.json`; // 构造JSON文件路径

        // appendDiv("file_func", file_path);
        try {
            const response = await fetch(file_path); // 请求JSON文件
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            data = await response.json(); // 解析JSON数据
            // userDataInfo.json = data[`${file_func}`]; // 将JSON数据添加到用户数据信息中
            console.log(data[`${file_func}`]);
            appendDiv(data[`${file_func}`], data[`${file_func}`]['名称']);
        } catch (error) {
            console.error('There has been a problem with your fetch operation:', error);
        }
    }

    // console.log(data);
}